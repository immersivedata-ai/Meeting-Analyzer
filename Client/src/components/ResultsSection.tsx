import { useState } from 'react';
import { 
  FileText, 
  BarChart3, 
  CheckSquare, 
  Target,
  Copy,
  Download,
  Search,
  Clock,
  Users,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisResults } from '@/types/analysis';

interface ResultsSectionProps {
  results: AnalysisResults;
}

export const ResultsSection = ({ results }: ResultsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionItems, setActionItems] = useState(results.action_items?.map(item => item.text) || []);
  const [newActionItem, setNewActionItem] = useState('');
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark class="bg-primary/20 text-primary">$1</mark>');
  };

  const addActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem('');
      toast({
        title: "Action item added",
        description: "New task added to your list",
      });
    }
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  // Fixed: Get transcription text from transcript array
  const transcriptionText = results.transcript?.map(segment => segment.text).join(' ') || '';
  const wordCount = transcriptionText.split(' ').filter(word => word.length > 0).length;
  const estimatedDuration = Math.ceil(wordCount / 150); // Assuming 150 words per minute

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-sm text-muted-foreground">Processing Time</div>
          <div className="text-lg font-semibold">{results.processing_time?.toFixed(1) || 0}s</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <Hash className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-sm text-muted-foreground">Word Count</div>
          <div className="text-lg font-semibold">{wordCount.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-sm text-muted-foreground">Est. Duration</div>
          <div className="text-lg font-semibold">{estimatedDuration}min</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <CheckSquare className="w-5 h-5 mx-auto mb-2 text-primary" />
          <div className="text-sm text-muted-foreground">Action Items</div>
          <div className="text-lg font-semibold">{actionItems.length}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search in transcription..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 glass border-glass-border/30"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transcription" className="space-y-6">
        <TabsList className="glass-strong border-glass-border/30 grid grid-cols-4 w-full">
          <TabsTrigger value="transcription" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Transcript</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Summary</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4" />
            <span>Actions</span>
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Decisions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcription" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Full Transcription</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(transcriptionText, 'Transcription')}
                className="glass-strong border-primary/30"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.transcript?.map((segment, index) => (
                <div key={segment.id || index} className="p-3 glass-strong rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {segment.speaker}
                    </Badge>
                    <div className="flex-1">
                      <div 
                        className="prose prose-invert max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(segment.text, searchTerm)
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        {Math.floor(segment.start_time / 60)}:{(segment.start_time % 60).toFixed(0).padStart(2, '0')} - 
                        {Math.floor(segment.end_time / 60)}:{(segment.end_time % 60).toFixed(0).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-8">
                  No transcription available
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI-Generated Summary</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(results.summary || '', 'Summary')}
                  className="glass-strong border-primary/30"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-strong border-primary/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-sm leading-relaxed">
              {results.summary || 'No summary available'}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Action Items</h3>
              <Badge variant="secondary" className="glass-strong">
                {actionItems.length} items
              </Badge>
            </div>
            
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 glass-strong rounded-lg">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-primary/30 text-primary focus:ring-primary/20"
                  />
                  <span className="flex-1 text-sm">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActionItem(index)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    ×
                  </Button>
                </div>
              ))}
              {actionItems.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No action items found
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <Input
                placeholder="Add new action item..."
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addActionItem()}
                className="glass border-glass-border/30"
              />
              <Button onClick={addActionItem} className="gradient-primary shadow-glow">
                Add
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Key Decisions</h3>
              <Badge variant="secondary" className="glass-strong">
                {results.key_decisions?.length || 0} decisions
              </Badge>
            </div>
            
            <div className="space-y-3">
              {results.key_decisions?.map((decision, index) => (
                <div key={decision.id || index} className="p-4 glass-strong rounded-lg border-l-4 border-primary/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">{decision.decision}</p>
                      {decision.rationale && (
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>Rationale:</strong> {decision.rationale}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        <strong>Impact:</strong> {decision.impact}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge 
                        variant="outline" 
                        className={`
                          text-xs
                          ${index % 3 === 0 ? 'border-red-500/30 text-red-400' : 
                            index % 3 === 1 ? 'border-yellow-500/30 text-yellow-400' : 
                            'border-green-500/30 text-green-400'}
                        `}
                      >
                        {index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-4">
                  No key decisions found
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};