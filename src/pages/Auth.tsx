import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemedBackground } from '@/components/ThemedBackground';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/');
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });

      // Navigation will happen automatically via useEffect
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Ocorreu um erro. Tente novamente.';
      
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid credentials')) {
        message = 'Email ou senha incorretos.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Por favor, confirme seu email primeiro.';
      } else if (error.message) {
        message = error.message;
      }

      toast({
        title: 'Erro no Login',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4">
      <ThemedBackground />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow-xl mb-4">
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className="font-display text-4xl font-bold glow-text">OP-CRIS</h1>
          <p className="text-muted-foreground mt-2">Sistema de Recursos para Ordem Paranormal</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-center mb-2">Entrar</h2>
            <p className="text-sm text-muted-foreground text-center">
              Use suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-xl font-display font-bold text-lg transition-all duration-300',
                'bg-gradient-to-r from-primary to-accent text-primary-foreground',
                'hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        {/* Back link */}
        <p className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            ← Voltar para o início
          </button>
        </p>
      </div>
    </div>
  );
}

export default function Auth() {
  return (
    <ThemeProvider>
      <AuthForm />
    </ThemeProvider>
  );
}
