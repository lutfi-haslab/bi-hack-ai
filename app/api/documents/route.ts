import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { processDocument, storeDocumentChunks } from '@/lib/document-processing';
import { initializeVectorStore } from '@/lib/vector/qdrant';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDocuments = await db.query.documents.findMany({
      where: eq(documents.userId, session.user.id),
      orderBy: [desc(documents.createdAt)],
    });

    return NextResponse.json(userDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize vector store if needed
    await initializeVectorStore();

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        // Create document record
        const newDocument = await db.insert(documents).values({
          userId: session.user.id,
          filename: `${Date.now()}-${file.name}`,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          status: 'processing',
        }).returning();

        const documentRecord = newDocument[0];

        // Process document in background
        processDocumentAsync(file, documentRecord);

        results.push({
          id: documentRecord.id,
          filename: documentRecord.originalName,
          status: 'processing',
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          filename: file.name,
          status: 'failed',
          error: 'Processing failed',
        });
      }
    }

    return NextResponse.json({ documents: results });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Delete from database
    const result = await db.delete(documents).where(
      eq(documents.id, documentId)
    ).returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Note: For LangChain + Qdrant, we would need to implement document deletion
    // This might require storing document IDs and using direct Qdrant client calls

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processDocumentAsync(file: File, documentRecord: any) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Process document
    const chunks = await processDocument(
      buffer,
      documentRecord.originalName,
      file.type,
      documentRecord.id,
      documentRecord.userId
    );

    // Store embeddings using LangChain
    await storeDocumentChunks(chunks);

    // Update document status
    await db.update(documents)
      .set({
        status: 'completed',
        chunkCount: chunks.length,
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentRecord.id));

  } catch (error) {
    console.error('Document processing error:', error);
    
    // Update document status to failed
    await db.update(documents)
      .set({ status: 'failed' })
      .where(eq(documents.id, documentRecord.id));
  }
}