import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

// Initialize embeddings with Google Generative AI
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddings.embedQuery(text);
    return result;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const result = await embeddings.embedDocuments(texts);
    return result;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}