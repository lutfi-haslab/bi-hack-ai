import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "../ai/embeddings";
import { Document } from "@langchain/core/documents";

export const COLLECTION_NAME = 'documents';

let vectorStore: QdrantVectorStore | null = null;

export async function getVectorStore(): Promise<QdrantVectorStore> {
  if (!vectorStore) {
    vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: COLLECTION_NAME,
      }
    );
  }
  return vectorStore;
}

export async function initializeVectorStore(): Promise<QdrantVectorStore> {
  try {
    // Try to get existing collection first
    return await getVectorStore();
  } catch (error) {
    // If collection doesn't exist, create it with empty documents
    console.log('Creating new Qdrant collection...');
    vectorStore = await QdrantVectorStore.fromDocuments(
      [], // Empty documents array to create collection
      embeddings,
      {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: COLLECTION_NAME,
      }
    );
    return vectorStore;
  }
}

export async function addDocuments(documents: Document[]): Promise<void> {
  const store = await getVectorStore();
  await store.addDocuments(documents);
}

export async function searchDocuments(
  query: string,
  k: number = 5,
  filter?: Record<string, any>
): Promise<Array<{ pageContent: string; metadata: any; score?: number }>> {
  try {
    const store = await getVectorStore();
  
    
    
    // Use similarity search with score
    const results = await store.similaritySearchWithScore(query, k, filter);
    console.log(results)
    
    return results.map(([doc, score]) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      score,
    }));
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

export async function deleteDocuments(filter: Record<string, any>): Promise<void> {
  try {
    const store = await getVectorStore();
    // Note: QdrantVectorStore doesn't have a direct delete method
    // You might need to implement this using the Qdrant client directly
    console.log('Delete operation requested with filter:', filter);
    // For now, we'll log this - you may need to implement direct Qdrant client calls
  } catch (error) {
    console.error('Error deleting documents:', error);
    throw error;
  }
}

export async function getDocumentCount(): Promise<number> {
  try {
    const store = await getVectorStore();
    // This is a workaround since QdrantVectorStore doesn't expose count directly
    const results = await store.similaritySearch('', 1);
    return results.length > 0 ? 1 : 0; // This is not accurate, just a placeholder
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
}