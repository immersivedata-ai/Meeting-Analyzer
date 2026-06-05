import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Settings, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { checkHealth } from '@/lib/api/health';
import { UserProfile } from '@/components/auth/UserProfile';

interface HeaderProps {
  processingTime?: number;
  isProcessing?: boolean;
}

export const Header = ({ processingTime, isProcessing }: HeaderProps) => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        await checkHealth();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="glass-strong border-b border-glass-border/30 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
          aria-label="Go to home page"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-6 h-6 text-white" />
            </div>
            {import.meta.env.DEV && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-glow-pulse">
                <div className={`w-full h-full rounded-full ${getStatusColor()}`} />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Manthan AI
            </h1>
            {import.meta.env.DEV && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Activity className="w-3 h-3" />
                <span className="capitalize">{apiStatus}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <UserProfile />

          {processingTime && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{processingTime.toFixed(1)}s</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Processing...</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-glass-border/30">
              <DropdownMenuItem className="text-sm">
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                Export Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
