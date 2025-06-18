import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { streamChatCompletion } from '@/lib/ai/chat';
import { searchDocumentsByUser } from '@/lib/document-processing';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { 
      message, 
      conversationId, 
      model = 'gemini-1.5-flash',
      useDocuments = false 
    } = await request.json();

    // Get conversation history
    let conversationMessages: any[] = [];
    if (conversationId) {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
        },
      });

      if (conversation) {
        conversationMessages = conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    }

    // Search documents if enabled
    let documentContext = '';
    let citations: any[] = [];
    if (useDocuments) {
      const searchResults = await searchDocumentsByUser(message, session.user.id, 5);
      if (searchResults.length > 0) {
        documentContext = searchResults
          .map(result => `[Source: ${result.metadata.filename}]\n${result.content}`)
          .join('\n\n');
        
        citations = searchResults.map(result => ({
          filename: result.metadata.filename,
          score: result.score,
        }));
      }
    }

    // Prepare messages for AI
    const systemMessage = documentContext
      ? `You are a helpful AI assistant. Use the following documents as context to answer the user's question. If the documents don't contain relevant information, you can use your general knowledge but mention that the information isn't from the provided documents.

Documents:
${documentContext}`
      : 'You are a helpful AI assistant.';

    const aiMessages = [
      { role: 'system' as const, content: systemMessage },
      ...conversationMessages,
      { role: 'user' as const, content: message },
    ];
    console.log(aiMessages);

    // Save user message
    if (conversationId) {
      await db.insert(messages).values({
        conversationId,
        role: 'user',
        content: message,
      });
    }

    // Create a ReadableStream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          
          await streamChatCompletion(
            aiMessages,
            model,
            (chunk) => {
              fullResponse += chunk;
              const data = `data: ${JSON.stringify({ 
                chunk, 
                citations: citations.length > 0 ? citations : undefined 
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          );

          // Save assistant message
          if (conversationId && fullResponse) {
            await db.insert(messages).values({
              conversationId,
              role: 'assistant',
              content: fullResponse,
              metadata: citations.length > 0 ? { citations } : null,
            });
          }

          // Send final event
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('Chat stream error:', error);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}