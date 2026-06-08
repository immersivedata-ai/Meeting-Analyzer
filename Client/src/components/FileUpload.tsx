import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileAudio, AlertTriangle, Loader2, Play } from 'lucide-react';
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

const stepLabels: Record<string, string> = {
  'Uploading...': 'Uploading your recording',
  'Transcribing...': 'Generating transcript',
  'Analyzing...': 'Extracting insights',
  'Complete!': 'Analysis complete',
};

export const FileUpload = ({ onFileAnalyzed, isProcessing, setIsProcessing }: FileUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    onError: (err) => setError(err.message),
  });

  if (isProcessing) {
    return (
      <div className="surface-raised rounded-xl p-8 md:p-12 text-center animate-scale-in">
        <div className="space-y-6 max-w-sm mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full gradient-primary flex items-center justify-center animate-glow-pulse">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {stepLabels[processingStep] || processingStep}
            </p>
            <p className="text-sm text-muted-foreground">
              {uploadProgress < 100 ? 'This takes about 15–30 seconds' : 'Redirecting to your results...'}
            </p>
          </div>

          <Progress value={uploadProgress} className="h-1.5" />

          <p className="text-xs text-muted-foreground tabular-nums">
            {uploadProgress}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          surface-raised rounded-xl p-10 md:p-14 text-center cursor-pointer
          transition-all duration-300 animate-fade-in
          ${isDragActive
            ? 'border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20'
            : 'hover:border-primary/30 hover:bg-primary/[0.02]'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-5 max-w-sm mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            {isDragActive ? (
              <FileAudio className="w-7 h-7 text-primary" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-lg font-semibold">
              {isDragActive ? 'Drop to upload' : 'Drop your recording here'}
            </p>
            <p className="text-sm text-muted-foreground">
              MP3, WAV, M4A, or MP4 — up to 25 MB
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="default"
            >
              Choose file
            </Button>
            <Button
              variant="ghost"
              size="default"
              className="text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onDrop([]);
              }}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Try with demo data
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="surface-raised border-destructive/30 animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Files are processed transiently — we do not store your recordings.
      </p>
    </div>
  );
};
