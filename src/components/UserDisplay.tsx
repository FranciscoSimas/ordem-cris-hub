import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type AppRole = 'admin' | 'master' | 'player';

interface UserDisplayProps {
  compact?: boolean;
}

export function UserDisplay({ compact = false }: UserDisplayProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>('player');
  const [displayName, setDisplayName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const profileResult = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
      
      if (profileResult.data?.display_name) {
        setDisplayName(profileResult.data.display_name);
      }

      // Try to fetch role, but don't fail if it doesn't exist
      try {
        const roleResult = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
        if (roleResult.data?.role) {
          setRole(roleResult.data.role as AppRole);
        }
      } catch (roleError) {
        // Silently fail - role is optional
        console.warn('Could not fetch user role:', roleError);
      }
    } catch (error) {
      // Silently fail
      console.warn('Could not fetch user data:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName('');
    setRole('player');
  };

  const roleLabels: Record<AppRole, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'text-destructive' },
    master: { label: 'Mestre', color: 'text-accent' },
    player: { label: 'Player', color: 'text-primary' },
  };

  if (!user) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-sm font-medium"
      >
        LOGIN
      </button>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
          {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium leading-none">{displayName || user.email?.split('@')[0]}</p>
          <p className={cn('text-xs', roleLabels[role].color)}>{roleLabels[role].label}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="ml-2 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Sair"
        >
          🚪
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
        {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName || user.email?.split('@')[0]}</p>
        <p className={cn('text-sm', roleLabels[role].color)}>{roleLabels[role].label}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
        title="Sair"
      >
        🚪
      </button>
    </div>
  );
}
