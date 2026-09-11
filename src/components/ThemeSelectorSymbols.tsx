import React, { useState } from 'react';
import { useTheme, ElementTheme, themeData } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const themeOrder: ElementTheme[] = ['fear', 'knowledge', 'death', 'energy', 'blood'];

// Get primary color for each theme
function getThemePrimaryColor(theme: ElementTheme): string {
  const colors: Record<ElementTheme, string> = {
    fear: 'hsl(210, 100%, 50%)', // Blue
    knowledge: 'hsl(45, 90%, 50%)', // Gold
    death: 'hsl(0, 0%, 85%)', // Gray/White
    energy: 'hsl(270, 100%, 60%)', // Purple
    blood: 'hsl(0, 85%, 50%)', // Red
  };
  return colors[theme];
}

export function ThemeSelectorSymbols() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<ElementTheme | null>(null);
  
  const currentInfo = themeData[theme];
  const currentColor = getThemePrimaryColor(theme);
  
  // Get other themes (excluding current)
  const otherThemes = themeOrder.filter(t => t !== theme);

  const handleThemeChange = (newTheme: ElementTheme) => {
    setTheme(newTheme);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative w-10 h-10 rounded-lg transition-all duration-300',
            'flex items-center justify-center',
            'border-2 border-primary',
            'hover:scale-105 active:scale-95',
            'shadow-glow'
          )}
          style={{
            backgroundColor: `hsl(var(--primary) / 0.1)`,
            borderColor: currentColor,
          }}
          title={currentInfo.name}
        >
          <img
            src={`/symbols/${theme}.png`}
            alt={currentInfo.name}
            className="w-7 h-7 object-contain opacity-100 brightness-110"
          />
          
          {/* Active indicator */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-auto p-2"
        align="start"
        sideOffset={8}
        style={{
          backgroundColor: `hsl(var(--background))`,
          borderColor: `hsl(var(--primary) / 0.3)`,
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {otherThemes.map((themeKey) => {
            const info = themeData[themeKey];
            const primaryColor = getThemePrimaryColor(themeKey);
            const isHovered = hoveredTheme === themeKey;

            return (
              <button
                key={themeKey}
                onClick={() => handleThemeChange(themeKey)}
                onMouseEnter={() => setHoveredTheme(themeKey)}
                onMouseLeave={() => setHoveredTheme(null)}
                className={cn(
                  'relative w-12 h-12 rounded-lg transition-all duration-200',
                  'flex items-center justify-center',
                  'border-2',
                  'hover:scale-110 active:scale-95',
                  'group'
                )}
                style={{
                  backgroundColor: isHovered ? `${primaryColor}20` : `hsl(var(--secondary) / 0.5)`,
                  borderColor: isHovered ? primaryColor : `hsl(var(--primary) / 0.2)`,
                }}
                title={info.name}
              >
                <img
                  src={`/symbols/${themeKey}.png`}
                  alt={info.name}
                  className={cn(
                    'w-8 h-8 object-contain transition-all duration-200',
                    isHovered ? 'opacity-100 brightness-110' : 'opacity-80 group-hover:opacity-100'
                  )}
                />
                
                {/* Hover glow effect */}
                {isHovered && (
                  <div
                    className="absolute inset-0 rounded-lg opacity-30 blur-sm -z-10"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

