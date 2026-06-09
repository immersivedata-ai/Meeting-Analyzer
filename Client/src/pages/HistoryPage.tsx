import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Clock,
  Trash2,
  Loader2,
  Search,
  Hash,
  ListChecks,
  Target,
  Upload,
  Play,
} from 'lucide-react';
import { fetchAnalyses, deleteAnalysis, fetchAnalysisDetail, type AnalysisSummary } from '@/lib/api/analyses';
import { sampleAnalysisResults } from '@/utils/demoData';

const HistoryPage = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnalyses();
      setAnalyses(data.analyses);
    } catch {
      toast({ title: 'Failed', description: 'Could not load history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysis(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Deleted' });
    } catch {
      toast({ title: 'Failed', description: 'Could not delete', variant: 'destructive' });
    }
  };

  const handleView = async (entry: AnalysisSummary) => {
    try {
      const detail = await fetchAnalysisDetail(entry.id);
      navigate('/results', { state: { results: detail } });
    } catch {
      toast({ title: 'Failed', description: 'Could not load analysis', variant: 'destructive' });
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

  const filtered = analyses.filter(a =>
    a.filename.toLowerCase().includes(search.toLowerCase())
  );

  const totalActions = analyses.reduce((s, a) => s + (a.action_items_count || 0), 0);
  const totalDecisions = analyses.reduce((s, a) => s + (a.decisions_count || 0), 0);
  const totalHours = (analyses.reduce((s, a) => s + (a.duration_seconds || 0), 0) / 3600).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 lg:px-10 xl:px-16 py-8 md:py-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">History</h1>
            <p className="text-sm text-muted-foreground">All your meeting analyses</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9" onClick={() => navigate('/')}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              New analysis
            </Button>
          </div>
        </div>

        {/* Stats summary */}
        {analyses.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
            {[
              { icon: Hash, label: 'Total analyses', value: analyses.length },
              { icon: Clock, label: 'Hours processed', value: `${totalHours}h` },
              { icon: ListChecks, label: 'Action items', value: totalActions },
              { icon: Target, label: 'Decisions', value: totalDecisions },
            ].map(stat => (
              <div key={stat.label} className="surface-raised rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums leading-none mb-0.5">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {analyses.length > 0 && (
          <div className="relative mb-6 animate-fade-in-up">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl surface-raised border border-border/60 text-sm bg-transparent placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="surface-raised rounded-xl border border-border/40 py-16 text-center">
            <Loader2 className="w-5 h-5 mx-auto mb-2 text-muted-foreground animate-spin" />
            <p className="text-xs text-muted-foreground">Loading history...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="surface-raised rounded-xl border border-border/40 py-16 text-center animate-fade-in">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/5 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary/30" />
            </div>
            <p className="text-sm font-medium mb-1">No analyses yet</p>
            <p className="text-xs text-muted-foreground mb-5 max-w-[280px] mx-auto leading-relaxed">
              Upload a meeting recording or try the demo to see what Manthan can do.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size="sm" className="h-9" onClick={() => navigate('/')}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload recording
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleDemo}>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                View demo
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-raised rounded-xl border border-border/40 py-16 text-center animate-fade-in">
            <Search className="w-5 h-5 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results for "{search}"</p>
          </div>
        ) : (
          <div className="surface-raised rounded-xl border border-border/40 overflow-hidden animate-fade-in">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_160px_140px_60px] gap-4 px-6 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>File</span>
              <span>Duration</span>
              <span>Extracted</span>
              <span>Processed</span>
              <span />
            </div>

            <div className="divide-y divide-border/40">
              {filtered.map(entry => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_100px_160px_140px_60px] gap-4 px-6 py-3.5 items-center group cursor-pointer hover:bg-primary/[0.03] transition-colors"
                  onClick={() => handleView(entry)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium truncate">{entry.filename}</p>
                  </div>

                  <span className="text-xs text-muted-foreground tabular-nums">
                    {entry.duration_seconds ? `${Math.round(entry.duration_seconds / 60)} min` : '—'}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {entry.action_items_count > 0 && `${entry.action_items_count} actions`}
                    {entry.action_items_count > 0 && entry.decisions_count > 0 && ' · '}
                    {entry.decisions_count > 0 && `${entry.decisions_count} decisions`}
                    {!entry.action_items_count && !entry.decisions_count && '—'}
                  </span>

                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatRelativeTime(entry.created_at)}
                  </span>

                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
    </div>
  );
};

export default HistoryPage;
