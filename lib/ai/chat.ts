import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Available models configuration
export const AVAILABLE_MODELS = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient Google AI model',
    provider: 'google',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Advanced Google AI model with enhanced capabilities',
    provider: 'google',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Efficient OpenAI model for everyday tasks',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Most capable OpenAI model',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Most capable OpenAI model',
    provider: 'openrouter',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek V3 Free',
    description: 'Free Deepseek V3 Model',
    provider: 'openrouter',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek V3',
    description: 'Most capable Deepseek V3 Model',
    provider: 'openrouter',
  }
];

function createChatModel(modelId: string) {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  if (model.provider === 'google') {
    return new ChatGoogleGenerativeAI({
      model: modelId,
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });
  } else if (model.provider === 'openrouter') {
    return new ChatOpenAI({
      model: modelId,
      apiKey: process.env.OPENROUTER_API_KEY,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: true,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          'X-Title': 'hasdev-ai'
        }
      }
    });
  }

  throw new Error(`Unsupported provider for model ${modelId}`);
}

function convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map(msg => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content);
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unknown message role: ${msg.role}`);
    }
  });
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  model: string = 'gemini-1.5-flash',
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    const chatModel = createChatModel(model);
    const langChainMessages = convertToLangChainMessages(messages);

    let fullResponse = '';

    // Create a streaming chain
    const outputParser = new StringOutputParser();
    const chain = chatModel.pipe(outputParser);

    // Stream the response
    const stream = await chain.stream(langChainMessages);

    for await (const chunk of stream) {
      fullResponse += chunk;
      onChunk?.(chunk);
    }

    return fullResponse;
  } catch (error) {
    console.error('Chat completion error:', error);
    throw error;
  }
}

export async function getChatCompletion(
  messages: ChatMessage[],
  model: string = 'gemini-1.5-flash'
): Promise<string> {
  try {
    const chatModel = createChatModel(model);
    const langChainMessages = convertToLangChainMessages(messages);

    const response = await chatModel.invoke(langChainMessages);
    return response.content as string;
  } catch (error) {
    console.error('Chat completion error:', error);
    throw error;
  }
}