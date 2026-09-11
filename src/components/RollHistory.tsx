import React, { useState, useEffect } from 'react';
import { useDiscord } from '@/contexts/DiscordContext';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X } from 'lucide-react';

export function RollHistory() {
  const { rollHistory, clearHistory } = useDiscord();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'normal' | 'campaign'>('normal');

  // Filter rolls by type
  const generalRollHistory = rollHistory.filter(roll => !roll.campaignId);
  const campaignRollHistory = rollHistory.filter(roll => roll.campaignId);

  // Auto-open when new general roll is added
  useEffect(() => {
    if (generalRollHistory.length > 0) {
      setIsOpen(true);
      setActiveTab('normal');
    }
  }, [rollHistory.length]);

  const handleClearHistory = () => {
    if (activeTab === 'normal') {
      // Clear only general rolls (those without campaignId)
      clearHistory((roll) => !roll.campaignId);
    } else {
      // Clear only campaign rolls (those with campaignId)
      clearHistory((roll) => !!roll.campaignId);
    }
  };

  // Better approach: filter in context or use a filtered clear
  const currentHistory = activeTab === 'normal' ? generalRollHistory : campaignRollHistory;

  if (currentHistory.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {isOpen ? (
        <div className="glass-card p-4 shadow-lg border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Histórico de Rolagens</h3>
            <div className="flex gap-2">
              {currentHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-xs h-7"
                >
                  Limpar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'normal' | 'campaign')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="normal" className="text-xs">
                Normal ({generalRollHistory.length})
              </TabsTrigger>
              <TabsTrigger value="campaign" className="text-xs">
                Em Campanha ({campaignRollHistory.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="normal" className="mt-0">
              <ScrollArea className="h-64">
                {generalRollHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma rolagem ainda
                  </p>
                ) : (
                  <div className="space-y-2 pr-2">
                    {[...generalRollHistory].reverse().map((roll) => (
                      <div
                        key={roll.id}
                        className={cn(
                          "p-2 rounded-lg text-xs border",
                          roll.sentToDiscord
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-secondary/50 border-border/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {roll.characterName} - {roll.isAttributeRoll ? roll.attribute : roll.skillName}
                            </div>
                            <div className="text-muted-foreground text-[10px] mt-1">
                              {roll.attribute} • {roll.formula}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono font-bold">
                                {roll.rolls.map((r, i) => (
                                  <span key={i} className={cn(
                                    r === 20 && "text-green-400",
                                    r === 1 && "text-red-400"
                                  )}>
                                    [{r}]
                                    {i < roll.rolls.length - 1 && " "}
                                  </span>
                                ))}
                              </span>
                              <span className="font-bold">→ {roll.total}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {roll.timestamp.toLocaleTimeString('pt-BR')}
                              {roll.sentToDiscord && (
                                <span className="ml-2 text-green-400">✓ Discord</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="campaign" className="mt-0">
              <ScrollArea className="h-64">
                {campaignRollHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma rolagem em campanha ainda
                  </p>
                ) : (
                  <div className="space-y-2 pr-2">
                    {[...campaignRollHistory].reverse().map((roll) => (
                      <div
                        key={roll.id}
                        className={cn(
                          "p-2 rounded-lg text-xs border",
                          roll.sentToDiscord
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-secondary/50 border-border/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {roll.characterName} - {roll.isAttributeRoll ? roll.attribute : roll.skillName}
                            </div>
                            <div className="text-muted-foreground text-[10px] mt-1">
                              {roll.attribute} • {roll.formula}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono font-bold">
                                {roll.rolls.map((r, i) => (
                                  <span key={i} className={cn(
                                    r === 20 && "text-green-400",
                                    r === 1 && "text-red-400"
                                  )}>
                                    [{r}]
                                    {i < roll.rolls.length - 1 && " "}
                                  </span>
                                ))}
                              </span>
                              <span className="font-bold">→ {roll.total}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {roll.timestamp.toLocaleTimeString('pt-BR')}
                              {roll.sentToDiscord && (
                                <span className="ml-2 text-green-400">✓ Discord</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 shadow-lg relative"
        >
          <span className="text-lg">🎲</span>
          {(generalRollHistory.length > 0 || campaignRollHistory.length > 0) && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {(generalRollHistory.length + campaignRollHistory.length) > 9 ? '9+' : (generalRollHistory.length + campaignRollHistory.length)}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}

