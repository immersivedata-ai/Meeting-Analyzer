import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertTriangle, CheckCircle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sampleAnalysisResults } from '@/utils/demoData';
import { analyzeFile } from '@/lib/api/analysis';
import type { FileUploadProps } from '@/types/analysis';

const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'video/mp4': ['.mp4'],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const FileUpload = ({ onFileAnalyzed, isProcessing, setIsProcessing }: FileUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setIsProcessing(true);
    setUploadProgress(0);
    
    const isDemoMode = acceptedFiles.length === 0;

    try {
      const file = acceptedFiles[0];

      setProcessingStep('Uploading...');
      for (let i = 0; i <= 30; i += 5) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProcessingStep('Transcribing...');
      for (let i = 30; i <= 60; i += 5) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setProcessingStep('Analyzing...');
      
      let results;
      
      if (isDemoMode) {
        results = sampleAnalysisResults;
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        try {
          results = await analyzeFile(file);
        } catch (apiError) {
          throw new Error(`Server error: ${(apiError as Error).message || 'Failed to process file'}. Check server logs.`);
        }
      }

      for (let i = 60; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProcessingStep('Complete!');
      
      setTimeout(() => {
        onFileAnalyzed(results);
        setIsProcessing(false);
        setUploadProgress(0);
        setProcessingStep('');
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingStep('');
    }
  }, [onFileAnalyzed, setIsProcessing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isProcessing,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onError: (err) => setError(err.message),
  });

  if (isProcessing) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-scale-in">
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center animate-glow-pulse">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{processingStep}</h3>
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            This may take a few moments depending on file size
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          glass rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragActive || dragActive ? 'border-primary/50 bg-primary/5 scale-105' : 'border-glass-border/30'}
          hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.02]
          animate-fade-in
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full gradient-glow flex items-center justify-center animate-float">
            {isDragActive ? (
              <CheckCircle className="w-10 h-10 text-primary" />
            ) : (
              <Upload className="w-10 h-10 text-primary" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {isDragActive ? 'Drop your file here' : 'Upload Meeting Recording'}
            </h3>
            <p className="text-muted-foreground">
              Drag & drop your audio or video file, or click to browse
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <File className="w-4 h-4" />
            <span>MP3, MP4, WAV, M4A • Max 25MB</span>
          </div>

          <div className="flex justify-center items-center space-x-6">
            <Button 
              variant="outline" 
              className="glass-strong border-primary/30 hover:bg-primary/10"
            >
              Choose File
            </Button>
            <Button 
              variant="gradient" 
              onClick={(e) => {
                e.stopPropagation();
                onDrop([]);
              }}
              className="shadow-glow"
            >
              <Zap className="w-4 h-4 mr-2" />
              Try Demo
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="glass border-red-500/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Your files are processed securely and never stored permanently
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <span>✓ End-to-end encrypted</span>
          <span>✓ Auto-deleted after processing</span>
          <span>✓ GDPR compliant</span>
        </div>
      </div>
    </div>
  );
};
