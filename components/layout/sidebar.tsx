"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  FileText, 
  Plus, 
  Menu, 
  X, 
  Search,
  Trash2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  conversations: Conversation[];
  user: any;
  onNewChat: () => void;
  onDeleteConversation?: (id: string) => void;
}

export function Sidebar({ conversations, user, onNewChat, onDeleteConversation }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        <Menu size={20} />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ease-in-out",
          "w-80 md:w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-lg font-semibold">AI Platform</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="md:hidden"
            >
              <X size={16} />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button onClick={onNewChat} className="w-full" size="sm">
              <Plus size={16} className="mr-2" />
              New Chat
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 cursor-pointer",
                    pathname.includes(conversation.id) && "bg-blue-50 border border-blue-200"
                  )}
                >
                  <Link
                    href={`/chat/${conversation.id}`}
                    className="flex-1 min-w-0"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{conversation.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                  {onDeleteConversation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        onDeleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Navigation */}
          <div className="border-t p-4 space-y-2">
            <Link
              href="/documents"
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-sm",
                pathname === '/documents' && "bg-blue-50 text-blue-600"
              )}
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              Documents
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-sm",
                pathname === '/settings' && "bg-blue-50 text-blue-600"
              )}
              onClick={() => setIsOpen(false)}
            >
              <Settings size={16} />
              Settings
            </Link>
          </div>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-500">Free Plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}