import React from 'react';
import { useTheme, themeData, ElementTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { theme, setTheme, themeInfo } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" style={{
        background: `radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 50%, hsl(var(--accent) / 0.1) 100%)`
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      {/* Animated particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto animate-fade-up">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow-xl animate-glow-pulse">
            <span className="text-5xl">⚔️</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 glow-text">
          OP-CRIS
        </h1>
        <p className="font-display text-xl md:text-2xl text-primary/80 mb-6">
          Sistema de Recursos para Ordem Paranormal
        </p>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10">
          Gerencie suas campanhas, role dados com estilo e tenha todas as referências 
          do sistema na palma da sua mão.
        </p>

        {/* Element Theme Selection */}
        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-4">Escolha seu Elemento</p>
          <div className="flex justify-center gap-3">
            {(Object.keys(themeData) as ElementTheme[]).map((key) => {
              const info = themeData[key];
              const isActive = theme === key;

              return (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={cn(
                    'relative group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300',
                    'border-2 min-w-[80px]',
                    isActive
                      ? 'border-primary bg-primary/10 scale-110 shadow-glow'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <span className={cn('text-3xl transition-transform', isActive && 'animate-glow-pulse')}>
                    {info.icon}
                  </span>
                  <span className="text-xs font-medium">{info.name}</span>
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-glow" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">"{themeInfo.description}"</p>
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          className={cn(
            'px-10 py-4 rounded-2xl font-display font-bold text-lg transition-all duration-300',
            'bg-gradient-to-r from-primary to-accent text-primary-foreground',
            'hover:shadow-glow-xl hover:scale-105 active:scale-95'
          )}
        >
          Começar Aventura
        </button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 rounded-full bg-primary/50" />
        </div>
      </div>
    </div>
  );
}
