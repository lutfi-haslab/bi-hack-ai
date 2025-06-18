"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    filename: string;
    score: number;
  }>;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, citations, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-lg transition-colors",
      role === 'user' 
        ? "bg-blue-50 ml-8" 
        : "bg-gray-50 mr-8"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        role === 'user' 
          ? "bg-blue-600 text-white" 
          : "bg-gray-600 text-white"
      )}>
        {role === 'user' ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          {role === 'assistant' ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
          
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
          )}
        </div>
        
        {citations && citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-200 px-2 py-1 rounded"
                >
                  {citation.filename} ({Math.round(citation.score * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}
        
        {role === 'assistant' && !isStreaming && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 px-2 text-xs"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}