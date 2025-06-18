"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export function DocumentUpload({ 
  onUpload, 
  uploading = false, 
  uploadProgress = 0,
  className 
}: DocumentUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`File ${file.name} is too large. Max size is 10MB.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File ${file.name} is not supported. Please upload PDF, TXT, or DOCX files.`);
          }
        });
      });
    }

    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
            ) : (
              <Upload className="h-6 w-6 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {uploading 
                ? "Processing documents..." 
                : isDragActive 
                  ? "Drop files here..." 
                  : "Upload documents"
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop files here, or click to browse
            </p>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <FileText size={12} />
              <span>PDF</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText size={12} />
              <span>TXT</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText size={12} />
              <span>DOCX</span>
            </div>
          </div>

          <div className="flex items-center justify-center text-xs text-gray-400">
            <AlertCircle size={10} className="mr-1" />
            <span>Max file size: 10MB</span>
          </div>
        </div>
      </div>

      {uploading && uploadProgress > 0 && (
        <div className="mt-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-gray-500 mt-1 text-center">
            {uploadProgress}% complete
          </p>
        </div>
      )}

      {!uploading && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => document.querySelector('input[type="file"]')?.click()}>
            <Upload size={16} className="mr-2" />
            Choose Files
          </Button>
        </div>
      )}
    </div>
  );
}