import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { checkHealth } from '@/lib/api/health';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  processingTime?: number;
  isProcessing?: boolean;
}

export const Header = ({ processingTime, isProcessing }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="glass border-b border-border/40 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          aria-label="Go to home page"
        >
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Manthan
          </span>
        </button>

        <div className="flex items-center gap-4">
          {processingTime !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{processingTime.toFixed(1)}s</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
          )}

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 surface-elevated">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-sm text-muted-foreground cursor-pointer"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
};
