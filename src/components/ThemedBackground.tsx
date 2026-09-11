import React from 'react';
import { useTheme, ElementTheme } from '@/contexts/ThemeContext';

const backgroundImages: Record<ElementTheme, string> = {
  fear: '/backgrounds/fear-bg.png',
  knowledge: '/backgrounds/knowledge-bg.png',
  death: '/backgrounds/death-bg.png',
  energy: '/backgrounds/energy-bg.png',
  blood: '/backgrounds/blood-bg.png',
};

export function ThemedBackground() {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImages[theme]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />
      
      {/* Overlay for better contrast and readability */}
      <div className="absolute inset-0 bg-background/30" />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60" />
    </div>
  );
}
