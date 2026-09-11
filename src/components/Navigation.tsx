import React from 'react';
import { cn } from '@/lib/utils';
import { ThemeSelectorSymbols } from './ThemeSelectorSymbols';
import { UserDisplay } from './UserDisplay';
import { useDiscord } from '@/contexts/DiscordContext';
import { Button } from './ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'dice', label: 'Dados', icon: '🎲' },
  { id: 'inventory', label: 'Inventário', icon: '🎒' },
  { id: 'characters', label: 'Personagens', icon: '👥' },
  { id: 'reference', label: 'Habilidades', icon: '⚡' },
  { id: 'campaigns', label: 'Campanhas', icon: '📜' },
  { id: 'notes', label: 'Notas', icon: '📝' },
];

interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  const { isDiscordEnabled, toggleDiscord } = useDiscord();

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <span className="text-xl">⚔️</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-lg leading-none">OP-CRIS</h1>
            <p className="text-[10px] text-muted-foreground">Sistema de Recursos</p>
          </div>
        </div>

        {/* Nav Items + Theme Symbols + User */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Discord Toggle Button - Left of Dados */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDiscord}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isDiscordEnabled
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            )}
            title={isDiscordEnabled ? "Discord Ativado" : "Discord Desativado"}
          >
            <span>{isDiscordEnabled ? "🟢" : "🔴"}</span>
            <span className="hidden xl:inline">Discord</span>
          </Button>
          
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeSection === item.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          {/* Theme Symbols - between Notes and Login */}
          <div className="hidden md:block ml-2">
            <ThemeSelectorSymbols />
          </div>
          {/* User Display */}
          <div className="ml-3">
            <UserDisplay compact />
          </div>
        </div>

        {/* Mobile: Right side with User */}
        <div className="lg:hidden flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDiscord}
            className={cn(
              "px-2 py-1 rounded-lg text-xs transition-all",
              isDiscordEnabled
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}
            title={isDiscordEnabled ? "Discord Ativado" : "Discord Desativado"}
          >
            {isDiscordEnabled ? "🟢" : "🔴"}
          </Button>
          <div className="hidden md:block">
            <ThemeSelectorSymbols />
          </div>
          <UserDisplay compact />
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="lg:hidden mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-center gap-1 overflow-x-auto">
          {/* Discord Toggle in Mobile Nav */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDiscord}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all min-w-fit",
              isDiscordEnabled
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}
            title={isDiscordEnabled ? "Discord Ativado" : "Discord Desativado"}
          >
            <span className="text-lg">{isDiscordEnabled ? "🟢" : "🔴"}</span>
            <span>Discord</span>
          </Button>
          
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all duration-200 min-w-fit',
                activeSection === item.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          {/* Theme Symbols - between Notes and Login on mobile */}
          <div className="ml-2">
            <ThemeSelectorSymbols />
          </div>
        </div>
      </div>
    </nav>
  );
}
