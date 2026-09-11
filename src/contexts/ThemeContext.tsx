import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ElementTheme = 'fear' | 'knowledge' | 'death' | 'energy' | 'blood';

interface ThemeContextType {
  theme: ElementTheme;
  setTheme: (theme: ElementTheme) => void;
  themeInfo: ThemeInfo;
}

interface ThemeInfo {
  name: string;
  description: string;
  icon: string;
  color: string;
}

const themeData: Record<ElementTheme, ThemeInfo> = {
  fear: {
    name: 'Medo',
    description: 'O elemento que paralisa a mente e congela a alma',
    icon: '👁️',
    color: 'blue',
  },
  knowledge: {
    name: 'Conhecimento',
    description: 'A luz dourada que ilumina os segredos ocultos',
    icon: '📜',
    color: 'gold',
  },
  death: {
    name: 'Morte',
    description: 'O fim inevitável e o início do desconhecido',
    icon: '💀',
    color: 'gray',
  },
  energy: {
    name: 'Energia',
    description: 'O poder que flui através de todas as coisas',
    icon: '⚡',
    color: 'purple',
  },
  blood: {
    name: 'Sangue',
    description: 'A essência da vida e o preço do poder',
    icon: '🩸',
    color: 'red',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ElementTheme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('op-cris-theme') as ElementTheme;
      const initialTheme = savedTheme || 'fear';
      // Apply theme immediately on initialization
      const root = document.documentElement;
      root.classList.remove('theme-fear', 'theme-knowledge', 'theme-death', 'theme-energy', 'theme-blood');
      root.classList.add(`theme-${initialTheme}`);
      return initialTheme;
    }
    return 'fear';
  });

  const setTheme = (newTheme: ElementTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('op-cris-theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('theme-fear', 'theme-knowledge', 'theme-death', 'theme-energy', 'theme-blood');
    // Add current theme class
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeInfo: themeData[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themeData };
