import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ResultsSection } from '@/components/ResultsSection';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalysisResults } from '@/types/analysis';

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
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
    a.download = `meeting-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: "Meeting analysis exported as JSON",
    });
  };

  const handleShare = () => {
    if (!results) return;
    
    const shareText = `Meeting Analysis Summary:\n\n${results.summary}\n\nAction Items:\n${results.action_items.map(item => `• ${item.text}`).join('\n')}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Meeting Analysis',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Meeting summary copied for sharing",
      });
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
  };

  if (!results) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header 
        processingTime={results.processing_time} 
        isProcessing={false}
      />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
              <p className="text-muted-foreground">
                Your meeting has been processed and analyzed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleNewUpload}
                variant="outline"
                className="px-6 py-2"
              >
                New Upload
              </Button>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Sign Out
              </Button>
            </div>
          </div>
          
          <ResultsSection results={results} />
        </div>
      </main>

      <FloatingActionButton
        onNewUpload={handleNewUpload}
        onExport={handleExport}
        onShare={handleShare}
        hasResults={true}
      />

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary-glow/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
};

export default ResultsPage;
