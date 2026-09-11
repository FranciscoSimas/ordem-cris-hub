import React, { createContext, useContext, useState, useEffect } from 'react';

interface DiscordContextType {
  isDiscordEnabled: boolean;
  toggleDiscord: () => void;
  rollHistory: Array<{
    id: string;
    characterName: string;
    skillName: string;
    attribute: string;
    rolls: number[];
    total: number;
    formula: string;
    timestamp: Date;
    sentToDiscord: boolean;
    campaignId?: string | null; // null = rolagem geral, string = rolagem de campanha específica
    isAttributeRoll?: boolean; // true = rolagem de atributo puro
  }>;
  addRollToHistory: (roll: Omit<DiscordContextType['rollHistory'][0], 'id' | 'timestamp'>) => void;
  clearHistory: (filter?: (roll: DiscordContextType['rollHistory'][0]) => boolean) => void;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export function DiscordProvider({ children }: { children: React.ReactNode }) {
  const [isDiscordEnabled, setIsDiscordEnabled] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('discord-enabled');
    return saved !== null ? saved === 'true' : true; // Default: enabled
  });

  const [rollHistory, setRollHistory] = useState<DiscordContextType['rollHistory']>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('roll-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('discord-enabled', String(isDiscordEnabled));
  }, [isDiscordEnabled]);

  useEffect(() => {
    // Keep only last 50 rolls
    const limited = rollHistory.slice(-50);
    localStorage.setItem('roll-history', JSON.stringify(limited));
  }, [rollHistory]);

  const toggleDiscord = () => {
    setIsDiscordEnabled(prev => !prev);
  };

  const addRollToHistory = (roll: Omit<DiscordContextType['rollHistory'][0], 'id' | 'timestamp'>) => {
    const newRoll = {
      ...roll,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setRollHistory(prev => [...prev, newRoll].slice(-50)); // Keep last 50
  };

  const clearHistory = (filter?: (roll: DiscordContextType['rollHistory'][0]) => boolean) => {
    if (filter) {
      setRollHistory(prev => {
        const filtered = prev.filter(r => !filter(r));
        return filtered;
      });
    } else {
      setRollHistory([]);
      localStorage.removeItem('roll-history');
    }
  };

  return (
    <DiscordContext.Provider
      value={{
        isDiscordEnabled,
        toggleDiscord,
        rollHistory,
        addRollToHistory,
        clearHistory,
      }}
    >
      {children}
    </DiscordContext.Provider>
  );
}

export function useDiscord() {
  const context = useContext(DiscordContext);
  if (context === undefined) {
    throw new Error('useDiscord must be used within a DiscordProvider');
  }
  return context;
}

