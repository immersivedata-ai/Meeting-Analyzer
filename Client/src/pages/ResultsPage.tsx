import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ResultsSection } from '@/components/ResultsSection';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Share2, Upload } from 'lucide-react';
import type { AnalysisResults } from '@/types/analysis';

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const results: AnalysisResults | null = location.state?.results || null;

  useEffect(() => {
    if (!results) {
      navigate('/');
    }
  }, [results, navigate]);

  const handleNewUpload = () => {
    navigate('/');
  };

  const handleExport = () => {
    if (!results) return;

    const exportData = {
      transcript: results.transcript,
      summary: results.summary,
      action_items: results.action_items,
      key_decisions: results.key_decisions,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manthan-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Analysis saved as JSON",
    });
  };

  const handleShare = () => {
    if (!results) return;

    const shareText = [
      `Meeting Summary:`,
      ``,
      results.summary,
      ``,
      `Action Items:`,
      ...(results.action_items || []).map((item: { text: string }) => `• ${item.text}`),
    ].join('\n');

    if (navigator.share) {
      navigator.share({ title: 'Meeting Analysis', text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied",
        description: "Summary copied to clipboard",
      });
    }
  };

  if (!results) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header processingTime={results.processing_time} />

      <main className="container mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <button
              onClick={handleNewUpload}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              New upload
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Analysis results</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewUpload}
              className="h-9"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              New
            </Button>
          </div>
        </div>

        <ResultsSection results={results} />
      </main>

      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
    </div>
  );
};

export default ResultsPage;
