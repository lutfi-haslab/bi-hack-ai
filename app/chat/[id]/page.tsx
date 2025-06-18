"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ModelSelector } from '@/components/chat/model-selector';
import { Sidebar } from '@/components/layout/sidebar';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ filename: string; score: number }>;
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-haiku');
  const [useDocuments, setUseDocuments] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchUserData();
    fetchConversations();
    fetchConversation();
  }, [conversationId]);

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

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data);
        
        // Convert messages
        const convertedMessages = data.messages
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            citations: msg.metadata?.citations,
          }));
        
        setMessages(convertedMessages);
      } else if (response.status === 404) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      router.push('/chat');
    }
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && !files?.length) return;

    // Handle file uploads first
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }

    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
          model: selectedModel,
          useDocuments,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.done) {
                setIsStreaming(false);
                break;
              }
              
              if (data.chunk) {
                assistantMessage.content += data.chunk;
                if (data.citations) {
                  assistantMessage.citations = data.citations;
                }
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id ? { ...assistantMessage } : msg
                  )
                );
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
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
        setUseDocuments(true);
      } else {
        toast.error('Failed to upload documents');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    }
  };

  if (!user || !conversation) {
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
        onNewChat={handleNewChat}
        onDeleteConversation={async (id) => {
          try {
            await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            fetchConversations();
            if (conversationId === id) {
              router.push('/chat');
            }
          } catch (error) {
            toast.error('Failed to delete conversation');
          }
        }}
      />

      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" />
              <h1 className="text-lg font-semibold truncate max-w-md">
                {conversation.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText size={16} />
              <span>Use Documents</span>
              <Switch
                checked={useDocuments}
                onCheckedChange={setUseDocuments}
              />
            </div>
          </div>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
          />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                citations={message.citations}
                isStreaming={isStreaming && message.role === 'assistant' && message === messages[messages.length - 1]}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder={useDocuments ? "Ask about your documents..." : "Type your message..."}
        />
      </div>
    </div>
  );
}