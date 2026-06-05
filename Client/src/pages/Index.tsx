import { useState } from 'react';
import { Header } from '@/components/Header';
import { FileUpload } from '@/components/FileUpload';
import { ResultsSection } from '@/components/ResultsSection';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Github, Chrome, Brain, Zap, Shield, Clock } from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';
import { sampleAnalysisResults } from '@/utils/demoData';
import type { AnalysisResults } from '@/types/analysis';

const Index = () => {
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const handleFileAnalyzed = (analysisResults: AnalysisResults) => {
    setResults(analysisResults);
  };

  const handleNewUpload = () => {
    setResults(null);
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
    
   const shareText = `Meeting Analysis Summary:\n\n${results.summary}\n\nAction Items:\n${results.action_items.map(item => `• ${typeof item === 'string' ? item : item.text}`).join('\n')}`;
    
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

  const handleSignIn = () => {
    setIsAuthenticated(true);
    toast({
      title: "Welcome back!",
      description: "You're now signed in to MeetingMind AI",
    });
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setResults(null);
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
  };

  return (
    <div className="min-h-screen">
      <Header 
        processingTime={results?.processing_time} 
        isProcessing={isProcessing}
        onLogoClick={() => setResults(null)}
      />
      
      <main className="container mx-auto px-6 py-8">
        {!isAuthenticated ? (
          /* Landing Page */
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16 animate-fade-in">
              <div className="mb-8">
                <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-primary-glow to-primary bg-clip-text text-transparent">
                  MeetingMind AI
                </h1>
                <p className="text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
                  Transform your meetings into actionable insights with AI-powered transcription, 
                  summaries, and intelligent analysis
                </p>
                <p className="text-lg text-muted-foreground/80">
                  Join thousands of professionals who trust MeetingMind AI for smarter meetings
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-16">
              <div className="glass border border-glass-border/30 rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">AI Transcription</h3>
                <p className="text-sm text-muted-foreground">Accurate speech-to-text with speaker identification</p>
              </div>
              <div className="glass border border-glass-border/30 rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Smart Summary</h3>
                <p className="text-sm text-muted-foreground">Key points and decisions in seconds</p>
              </div>
              <div className="glass border border-glass-border/30 rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Action Items</h3>
                <p className="text-sm text-muted-foreground">Automatically extract tasks and follow-ups</p>
              </div>
              <div className="glass border border-glass-border/30 rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">Enterprise-grade security for your data</p>
              </div>
            </div>

            {/* Sign In Section */}
            <div className="max-w-md mx-auto">
              <div className="glass border border-glass-border/30 rounded-2xl p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Get Started</h2>
                <p className="text-muted-foreground mb-8">Sign in to start analyzing your meetings</p>
                
                <div className="space-y-4">
                  <Button 
                    onClick={handleSignIn}
                    variant="gradient" 
                    size="lg" 
                    className="w-full"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Continue with Email
                  </Button>
                  
                  <Button 
                    onClick={handleSignIn}
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    Continue with GitHub
                  </Button>
                  
                  <Button 
                    onClick={handleSignIn}
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                  >
                    <Chrome className="w-5 h-5 mr-2" />
                    Continue with Google
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-glass-border/30">
                  <p className="text-xs text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !results ? (
          /* File Upload Section (Authenticated) */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <div 
                className="relative overflow-hidden rounded-3xl mb-8 h-64 flex items-center justify-center"
                style={{
                  backgroundImage: `url(${heroBackground})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div className="relative z-10 text-center">
                  <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                    Transform Your Meetings
                  </h1>
                  <p className="text-xl text-white/90 mb-2">
                    Upload your meeting recordings and get instant AI-powered analysis
                  </p>
                  <p className="text-sm text-white/70">
                    Transcription • Summary • Action Items • Key Decisions
                  </p>
                </div>
              </div>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <FileUpload
                onFileAnalyzed={handleFileAnalyzed}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
                <p className="text-muted-foreground">
                  Your meeting has been processed and analyzed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNewUpload}
                  className="px-6 py-2 glass-strong rounded-lg border border-primary/30 hover:bg-primary/10 transition-all duration-300 text-sm"
                >
                  New Upload
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
            
            <ResultsSection results={results} />
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onNewUpload={handleNewUpload}
        onExport={handleExport}
        onShare={handleShare}
        hasResults={!!results}
      />

      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary-glow/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
};

export default Index;

