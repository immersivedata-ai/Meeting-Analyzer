import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Brain, ArrowRight, Mic, FileText, CheckCircle2, LogIn, Clock, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { fetchAnalyses, deleteAnalysis, fetchAnalysisDetail, type AnalysisSummary } from '@/lib/api/analyses';
import type { AnalysisResults } from '@/types/analysis';

const featuresForLanding = [
  {
    icon: Mic,
    title: 'Transcribe with precision',
    description: 'Speaker-labeled transcripts with timestamps — supports Hindi, English, and mixed conversations.',
  },
  {
    icon: FileText,
    title: 'Extract what matters',
    description: 'AI-generated summaries, action items, and key decisions. From hours of audio to minutes of reading.',
  },
  {
    icon: CheckCircle2,
    title: 'Private by design',
    description: 'Your recordings are processed transiently and never stored. End-to-end encrypted in transit.',
  },
];

const HomePage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setHistoryLoading(true);
    try {
      const data = await fetchAnalyses();
      setAnalyses(data.analyses);
    } catch {
      // History fetch is non-critical — silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFileAnalyzed = (analysisResults: AnalysisResults) => {
    navigate('/results', { state: { results: analysisResults } });
    loadHistory();
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteAnalysis(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Deleted', description: 'Analysis removed from history' });
    } catch {
      toast({ title: 'Failed', description: 'Could not delete analysis', variant: 'destructive' });
    }
  };

  const handleViewResults = async (entry: AnalysisSummary) => {
    try {
      const detail = await fetchAnalysisDetail(entry.id);
      navigate('/results', { state: { results: detail } });
    } catch {
      toast({ title: 'Failed', description: 'Could not load analysis', variant: 'destructive' });
    }
  };

  const formatRelativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header />

        <main className="container mx-auto px-6">
          {/* Hero */}
          <section className="pt-24 pb-20 md:pt-32 md:pb-28 text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
              <Brain className="w-3.5 h-3.5" />
              Meeting Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Your meetings,{' '}
              <span className="gradient-text">understood.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Upload a meeting recording. Get a precise transcript, smart summary,
              and clear action items — all in under a minute.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                className="gradient-primary text-base h-12 px-8"
                onClick={() => navigate('/signup')}
              >
                Get started free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base h-12 px-8"
                onClick={() => navigate('/login')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in
              </Button>
            </div>
          </section>

          {/* Features */}
          <section className="pb-24 md:pb-32 max-w-4xl mx-auto animate-fade-in-up">
            <div className="grid md:grid-cols-3 gap-6">
              {featuresForLanding.map((feature, i) => (
                <div
                  key={feature.title}
                  className="surface-raised rounded-xl p-6 flex flex-col gap-4"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trust strip */}
          <section className="pb-24 md:pb-32 text-center max-w-lg mx-auto animate-fade-in-up">
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by teams who value privacy and precision
            </p>
            <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                End-to-end encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Auto-deleted after processing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                No permanent storage
              </span>
            </div>
          </section>
        </main>

        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
        </div>
      </div>
    );
  }

  /* Authenticated */
  return (
    <div className="min-h-screen">
      <Header isProcessing={isProcessing} />

      <main className="container mx-auto px-6">
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 max-w-2xl mx-auto animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Analyze a meeting
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upload an audio or video recording. We will transcribe, summarize,
              and extract action items automatically.
            </p>
          </div>

          <FileUpload
            onFileAnalyzed={(results) => {
              handleFileAnalyzed(results);
              refreshHistory();
            }}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </section>

        {/* History */}
        <section className="pb-24 max-w-2xl mx-auto animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Recent analyses</h2>
          </div>

          {historyLoading && analyses.length === 0 ? (
            <div className="surface-raised rounded-lg p-8 text-center">
              <Loader2 className="w-5 h-5 mx-auto mb-2 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="surface-raised rounded-lg p-8 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No analyses yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a recording above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map((entry) => (
                <div
                  key={entry.id}
                  className="surface-raised rounded-lg p-4 flex items-center gap-4 group cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleViewResults(entry)}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.filename}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(entry.created_at)}
                      </span>
                      <span>{entry.action_items_count} actions</span>
                      <span>{entry.word_count.toLocaleString()} words</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEntry(entry.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
    </div>
  );
};

export default HomePage;
