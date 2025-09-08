import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // em MB
  onFileSelect: (file: File | null) => void;
  preview?: string;
  className?: string;
  label?: string;
  description?: string;
}

export function FileUpload({
  accept = "image/*",
  maxSize = 5,
  onFileSelect,
  preview,
  className,
  label = "Upload de arquivo",
  description = "Selecione um arquivo para upload"
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validar tamanho do arquivo
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${maxSize}MB.`);
      return;
    }

    // Validar tipo do arquivo
    if (accept !== "*" && !file.type.match(accept.replace("*", ".*"))) {
      setError("Tipo de arquivo não suportado.");
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary/50 hover:bg-accent/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {preview ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {accept.includes("image") ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <FileImage className="h-16 w-16 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Arquivo selecionado</p>
                <p className="text-xs text-muted-foreground">Clique para alterar</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <Button type="button" variant="outline">
                Selecionar arquivo
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}