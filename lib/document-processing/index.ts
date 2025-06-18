"use server";
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { addDocuments, searchDocuments } from '../vector/qdrant';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    userId: string;
    filename: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

export async function processDocument(
  buffer: Buffer,
  filename: string,
  fileType: string,
  documentId: string,
  userId: string
): Promise<DocumentChunk[]> {
  let text = '';

  // Extract text based on file type
  switch (fileType) {
    case 'application/pdf':
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const docxResult = await mammoth.extractRawText({ buffer });
      text = docxResult.value;
      break;
    case 'text/plain':
      text = buffer.toString('utf-8');
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Clean and normalize text
  text = text.replace(/\s+/g, ' ').trim();

  // Use LangChain's text splitter for better chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await textSplitter.splitText(text);

  // Create document chunks with metadata
  const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => {
    const startChar = text.indexOf(chunk);
    return {
      id: uuidv4(),
      content: chunk,
      metadata: {
        documentId,
        userId,
        filename,
        chunkIndex: index,
        startChar: startChar >= 0 ? startChar : 0,
        endChar: startChar >= 0 ? startChar + chunk.length : chunk.length,
      },
    };
  });

  return documentChunks;
}

export async function storeDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  try {
    // Convert chunks to LangChain Document format
    const documents = chunks.map(chunk => new Document({
      pageContent: chunk.content,
      metadata: {
        id: chunk.id,
        ...chunk.metadata,
      },
    }));

    // Add documents to vector store
    await addDocuments(documents);
  } catch (error) {
    console.error('Error storing document chunks:', error);
    throw error;
  }
}

export async function searchDocumentsByUser(
  query: string,
  userId: string,
  limit: number = 5
): Promise<Array<{ content: string; metadata: any; score: number }>> {
  try {

    const filter = {
      must: [{ key: "metadata.userId", match: { value: userId } }],
    };
    // Search with user filter
    const results = await searchDocuments(
      query,
      limit,
      filter // Filter by user ID
    );

    return results.map(result => ({
      content: result.pageContent,
      metadata: result.metadata,
      score: result.score || 0,
    }));
  } catch (error) {
    console.error('Error searching documents:', JSON.stringify(error));
    return [];
  }
}

export { searchDocuments as searchAllDocuments };