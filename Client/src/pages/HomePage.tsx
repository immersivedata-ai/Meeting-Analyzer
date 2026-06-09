import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  ArrowRight,
  Mic,
  FileText,
  CheckCircle2,
  LogIn,
  Clock,
  Trash2,
  Loader2,
  Upload,
  Shield,
  Zap,
  Lock,
  ListChecks,
  MessageSquareText,
  Play,
  Sparkles,
  TrendingUp,
  Hash,
  Users,
  Target,
  ChevronRight,
  ArrowUpRight,
  Gauge,
} from 'lucide-react';
import { fetchAnalyses, deleteAnalysis, fetchAnalysisDetail, type AnalysisSummary } from '@/lib/api/analyses';
import { sampleAnalysisResults } from '@/utils/demoData';
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

const trustItems = [
  { icon: Lock, label: 'Private by default' },
  { icon: Shield, label: 'Secure encryption' },
  { icon: Zap, label: 'Auto-delete after processing' },
  { icon: TrendingUp, label: 'Enterprise ready' },
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
      // History fetch is non-critical
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

  const handleViewResults = async (entry: AnalysisSummary) => {
    try {
      const detail = await fetchAnalysisDetail(entry.id);
      navigate('/results', { state: { results: detail } });
    } catch {
      toast({ title: 'Failed', description: 'Could not load analysis', variant: 'destructive' });
    }
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

  const handleDemo = () => {
    navigate('/results', { state: { results: sampleAnalysisResults } });
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

  const priorityLabel = (p: string) =>
    ({ high: 'High', medium: 'Medium', low: 'Low' })[p?.toLowerCase()] ?? p;

  const priorityStyle = (p: string) =>
    ({
      high: 'text-red-400 bg-red-400/[0.06] border-red-400/20',
      medium: 'text-amber-400 bg-amber-400/[0.06] border-amber-400/20',
      low: 'text-emerald-400 bg-emerald-400/[0.06] border-emerald-400/20',
    })[p?.toLowerCase()] ?? '';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-6">
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
              <Button size="lg" className="gradient-primary text-base h-12 px-8" onClick={() => navigate('/signup')}>
                Get started free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="text-base h-12 px-8" onClick={() => navigate('/login')}>
                <LogIn className="w-4 h-4 mr-2" /> Sign in
              </Button>
            </div>
          </section>

          <section className="pb-24 md:pb-32 max-w-4xl mx-auto animate-fade-in-up">
            <div className="grid md:grid-cols-3 gap-6">
              {featuresForLanding.map((feature, i) => (
                <div key={feature.title} className="surface-raised rounded-xl p-6 flex flex-col gap-4" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div><h3 className="font-semibold mb-1.5">{feature.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="pb-24 md:pb-32 text-center max-w-lg mx-auto animate-fade-in-up">
            <p className="text-sm text-muted-foreground mb-4">Trusted by teams who value privacy and precision</p>
            <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/60" />End-to-end encrypted</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/60" />Auto-deleted after processing</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/60" />No permanent storage</span>
            </div>
          </section>
        </main>
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     Authenticated workspace
     ════════════════════════════════════════════ */

  const hasHistory = analyses.length > 0;
  const totalActions = analyses.reduce((sum, a) => sum + (a.action_items_count || 0), 0);
  const totalDecisions = analyses.reduce((sum, a) => sum + (a.decisions_count || 0), 0);
  const totalHours = (analyses.reduce((s, a) => s + (a.duration_seconds || 0), 0) / 3600).toFixed(1);
  const demo = sampleAnalysisResults;

  return (
    <div className="min-h-screen flex flex-col">
      <Header isProcessing={isProcessing} />

      <main className="flex-1 px-6 lg:px-10 xl:px-16">

        {/* ═══════════════════════════════════════
            SECTION 1 — Metrics (top)
            ═══════════════════════════════════════ */}
        <section className="pt-8 md:pt-10 pb-6 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Hash, label: 'Meetings', value: analyses.length, ctx: hasHistory ? `${analyses.length} total` : 'Upload your first' },
              { icon: Clock, label: 'Hours processed', value: `${totalHours}h`, ctx: hasHistory ? 'Across recordings' : 'Powered by Gemini' },
              { icon: ListChecks, label: 'Action items', value: totalActions, ctx: hasHistory ? `${totalActions} extracted` : 'Auto-generated' },
              { icon: Target, label: 'Key decisions', value: totalDecisions, ctx: hasHistory ? `${totalDecisions} captured` : 'With rationale' },
            ].map(stat => (
              <div key={stat.label} className="surface-raised rounded-xl border border-border/30 p-5 flex flex-col">
                <div className="w-8 h-8 rounded-lg bg-primary/[0.07] flex items-center justify-center mb-3 border border-primary/10">
                  <stat.icon className="w-4 h-4 text-primary/60" />
                </div>
                <p className="text-[34px] font-bold tabular-nums leading-none tracking-[-0.02em] mb-1">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-xs font-medium mb-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/80">{stat.ctx}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 2 — Hero + Upload (two-column)
            ═══════════════════════════════════════ */}
        <section className="pb-8 md:pb-12 animate-fade-in-up">
          <div className="grid lg:grid-cols-4 gap-4 items-stretch">

            {/* LEFT — Hero */}
            <div className="lg:col-span-2 pt-0 lg:pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.07] border border-primary/15 text-[13px] text-primary/80 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Conversation Intelligence
              </div>

              <h1 className="text-[40px] md:text-[52px] lg:text-[60px] font-bold tracking-[-0.025em] leading-[1.03] mb-5 max-w-[640px]">
                Transform recordings into{' '}
                <span className="gradient-text">actionable intelligence.</span>
              </h1>

              <p className="text-[15px] md:text-[17px] text-muted-foreground leading-relaxed max-w-[520px] mb-8">
                Generate speaker-labeled transcripts, summaries, key decisions,
                and action items automatically — in minutes, not hours.
              </p>

              {/* Value bullets */}
              <div className="space-y-3 mb-8">
                {[
                  { label: 'Speaker-labeled transcripts', desc: 'Every word attributed to the right person' },
                  { label: 'AI-powered summaries', desc: 'Key takeaways in 2–3 sentences' },
                  { label: 'Action items & decisions', desc: 'With assignees, deadlines, and rationale' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/[0.08] border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Upload */}
            <div className="lg:col-span-2 h-full">
              <div className="surface-raised rounded-xl border border-border/30 overflow-hidden h-full flex flex-col">
                <div className="py-4 px-4 flex-1 flex items-center justify-center">
                    <FileUpload
                      onFileAnalyzed={(results) => {
                        handleFileAnalyzed(results);
                        loadHistory();
                      }}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                    />
                </div>
                <div className="px-6 md:px-8 py-3 border-t border-border/20 bg-[hsl(var(--muted)/0.25)] flex flex-col gap-2">
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3 h-3 text-primary/50" />
                      <span className="text-foreground/70 font-medium">150 MB</span> max
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3 h-3 text-primary/50" />
                      <span className="text-foreground/70 font-medium">1–3 min</span> typical
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquareText className="w-3 h-3 text-primary/50" />
                      Hindi · English · Hinglish
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60">
                    MP3 · WAV · M4A · MP4 · OGG · FLAC · WEBM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 3 — Sample analysis
            ═══════════════════════════════════════ */}
        <section className="pb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="surface-raised rounded-xl border border-border/30 overflow-hidden">
            {/* Header */}
            <div className="px-6 md:px-8 py-4 border-b border-border/20 bg-[hsl(var(--muted)/0.12)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/[0.1] flex items-center justify-center border border-primary/15">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Sample analysis — Q4 Project Review</h3>
                  <p className="text-[11px] text-muted-foreground">What you receive after every upload</p>
                </div>
              </div>
              <button onClick={handleDemo} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/70 transition-colors">
                Open full demo <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {/* Summary — full width, most prominent */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-primary/60" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Meeting Summary</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85 max-w-[860px]">{demo.summary}</p>
              </div>

              {/* Decisions + Actions side by side */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Key Decisions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Key Decisions</span>
                    <span className="text-[10px] text-muted-foreground">{demo.key_decisions.length}</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { decision: 'Adopt mobile-first design approach', rationale: 'User research shows 70% access via mobile devices', impact: 'high' },
                      { decision: 'Extend project timeline by one week', rationale: 'Additional time needed for thorough testing and feedback integration', impact: 'medium' },
                      { decision: 'Allocate QA resources earlier in the cycle', rationale: 'Prevent bottlenecks during the final testing phase', impact: 'high' },
                    ].map((d, i) => (
                      <div key={i} className="surface-raised rounded-lg border border-border/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${d.impact === 'high' ? 'text-red-400 bg-red-400/[0.06] border-red-400/20' : 'text-amber-400 bg-amber-400/[0.06] border-amber-400/20'}`}>
                            {d.impact.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-snug mb-1">{d.decision}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{d.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Action Items</span>
                    <span className="text-[10px] text-muted-foreground">{demo.action_items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {demo.action_items.map(item => (
                      <div key={item.id} className="surface-raised rounded-lg border border-border/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${priorityStyle(item.priority)}`}>
                            {priorityLabel(item.priority)}
                          </span>
                        </div>
                        <p className="text-xs leading-snug mb-2">{item.text}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-primary/40" />{item.assignee || 'Unassigned'}</span>
                          {item.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary/40" />{item.deadline}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 4 — Recent analyses
            ═══════════════════════════════════════ */}
        <section className="pb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="surface-raised rounded-xl border border-border/30 overflow-hidden">
            <div className="px-6 md:px-8 py-4 border-b border-border/20 bg-[hsl(var(--muted)/0.1)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Recent analyses</h3>
                {hasHistory && <p className="text-[10px] text-muted-foreground mt-0.5">{analyses.length} analyses · {totalHours}h processed</p>}
              </div>
              {hasHistory && (
                <button onClick={() => navigate('/history')} className="text-[11px] text-primary hover:text-primary/70 transition-colors font-medium flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {historyLoading && analyses.length === 0 ? (
              <div className="py-12 text-center">
                <Loader2 className="w-5 h-5 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            ) : !hasHistory ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/[0.04] flex items-center justify-center border border-primary/10">
                  <FileText className="w-6 h-6 text-primary/25" />
                </div>
                <p className="text-sm font-medium mb-1">No analyses yet</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Upload a recording or try the demo to see what Manthan produces.
                </p>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDemo}>
                  <Play className="w-3 h-3 mr-1.5" /> View demo analysis
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/15">
                {analyses.slice(0, 6).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`px-6 md:px-8 py-3.5 flex items-center gap-4 group cursor-pointer transition-colors hover:bg-primary/[0.02] ${idx % 2 === 1 ? 'bg-[hsl(var(--muted)/0.06)]' : ''}`}
                    onClick={() => handleViewResults(entry)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/[0.07] flex items-center justify-center flex-shrink-0 border border-primary/10">
                      <FileText className="w-4 h-4 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[1fr_85px_125px_105px] gap-x-4 gap-y-1 items-center">
                      <p className="text-sm font-medium truncate">{entry.filename}</p>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{entry.duration_seconds ? `${Math.round(entry.duration_seconds / 60)} min` : '—'}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {entry.action_items_count > 0 && `${entry.action_items_count} actions`}
                        {entry.decisions_count > 0 && ` · ${entry.decisions_count} decisions`}
                        {!entry.action_items_count && !entry.decisions_count && '—'}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground/40" />
                        {formatRelativeTime(entry.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/25" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 5 — Trust strip (footer)
            ═══════════════════════════════════════ */}
        <section className="pb-12 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-center gap-6 md:gap-12 flex-wrap text-[11px] text-muted-foreground/70">
            {trustItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5 text-primary/35" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ═══ Background depth — layered ═══ */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 w-[1000px] h-[1000px] rounded-full bg-primary/[0.01] blur-[160px]" />
        <div className="absolute top-1/3 -left-40 w-[800px] h-[800px] rounded-full bg-primary/[0.012] blur-[140px]" />
        <div className="absolute -bottom-40 right-1/3 w-[600px] h-[600px] rounded-full bg-primary/[0.008] blur-[120px]" />
      </div>
    </div>
  );
};

export default HomePage;
