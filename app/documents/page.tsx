"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { DocumentUpload } from '@/components/components/document-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Document {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'completed' | 'failed';
  chunkCount?: number;
  createdAt: string;
  processedAt?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
    fetchConversations();
    fetchDocuments();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/login');
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Uploaded ${data.documents.length} document(s)`);
        fetchDocuments();
      } else {
        toast.error('Failed to upload documents');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Document deleted');
        fetchDocuments();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'processing':
        return <Clock size={16} className="text-yellow-600" />;
      case 'failed':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={conversations}
        user={user}
        onNewChat={() => router.push('/chat')}
        onDeleteConversation={async (id) => {
          try {
            await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            fetchConversations();
          } catch (error) {
            toast.error('Failed to delete conversation');
          }
        }}
      />

      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            <h1 className="text-lg font-semibold">Document Management</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your documents for AI-powered chat
          </p>
        </div>

        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload PDF, TXT, or DOCX files to enable document-based conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload
                  onUpload={handleUpload}
                  uploading={uploading}
                />
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Documents</CardTitle>
                <CardDescription>
                  Manage your uploaded documents and their processing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No documents yet
                    </h3>
                    <p className="text-gray-500">
                      Upload your first document to get started with document-based AI chat.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText size={20} className="text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.originalName}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span>•</span>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                {doc.chunkCount && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.chunkCount} chunks</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle>How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p>Upload your documents (PDF, TXT, or DOCX files up to 10MB each)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p>Documents are automatically processed and split into searchable chunks</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p>Enable "Use Documents" in chat to ask questions about your uploaded content</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <p>AI will reference your documents and provide citations in responses</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}