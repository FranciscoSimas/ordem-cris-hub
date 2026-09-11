import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Dice3D } from './dice/Dice3D';

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface DiceConfig {
  sides: number;
  icon: string;
}

const diceConfigs: Record<DiceType, DiceConfig> = {
  d4: { sides: 4, icon: '▲' },
  d6: { sides: 6, icon: '⬡' },
  d8: { sides: 8, icon: '◆' },
  d10: { sides: 10, icon: '◇' },
  d12: { sides: 12, icon: '⬠' },
  d20: { sides: 20, icon: '⬣' },
  d100: { sides: 100, icon: '%' },
};

interface RollResult {
  id: string;
  dice: DiceType;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
  timestamp: Date;
}

export function DiceRoller() {
  const [selectedDice, setSelectedDice] = useState<DiceType>('d20');
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);

  // Generate cryptographically secure random number between 1 and sides
  const secureRandomDice = useCallback((sides: number): number => {
    // Use crypto.getRandomValues for true randomness (available in browsers)
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // Convert to range [1, sides]
    return (array[0] % sides) + 1;
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    const config = diceConfigs[selectedDice];
    const rolls: number[] = [];

    // Use cryptographically secure random for each die
    for (let i = 0; i < diceCount; i++) {
      rolls.push(secureRandomDice(config.sides));
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier;

    const result: RollResult = {
      id: Date.now().toString(),
      dice: selectedDice,
      count: diceCount,
      modifier,
      rolls,
      total,
      timestamp: new Date(),
    };

    setTimeout(() => {
      setCurrentResult(result);
      setHistory((prev) => [result, ...prev].slice(0, 20));
      setIsRolling(false);
    }, 1200);
  }, [selectedDice, diceCount, modifier, isRolling, secureRandomDice]);

  const isCritical = currentResult && selectedDice === 'd20' && currentResult.rolls.includes(20);
  const isFumble = currentResult && selectedDice === 'd20' && currentResult.rolls.includes(1);

  // Calculate size based on dice count (smaller when multiple dice)
  const diceSize = diceCount > 1 ? Math.max(0.6, 1 / Math.sqrt(diceCount)) : 1;

  return (
    <div className="space-y-6">
      {/* 3D Dice Display - Show multiple dice if count > 1 */}
      <div className="flex justify-center items-center flex-wrap gap-4 py-4">
        {diceCount === 1 ? (
          <Dice3D
            type={selectedDice}
            result={currentResult?.rolls[0] ?? null}
            isRolling={isRolling}
            size={1}
          />
        ) : (
          currentResult?.rolls.map((roll, index) => (
            <Dice3D
              key={index}
              type={selectedDice}
              result={isRolling ? null : roll}
              isRolling={isRolling}
              size={diceSize}
            />
          )) || Array.from({ length: diceCount }, (_, index) => (
            <Dice3D
              key={index}
              type={selectedDice}
              result={null}
              isRolling={isRolling}
              size={diceSize}
            />
          ))
        )}
      </div>

      {/* Dice Selection */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(diceConfigs) as DiceType[]).map((dice) => (
          <button
            key={dice}
            onClick={() => setSelectedDice(dice)}
            className={cn(
              'relative w-12 h-12 rounded-xl font-display font-bold text-sm transition-all duration-300',
              'border-2 flex items-center justify-center',
              selectedDice === dice
                ? 'bg-primary text-primary-foreground border-primary shadow-glow scale-110'
                : 'bg-secondary/50 text-foreground border-border hover:border-primary/50 hover:bg-secondary'
            )}
          >
            <span className="text-base">{diceConfigs[dice].icon}</span>
            <span className="absolute -bottom-1 text-[9px] bg-background px-1 rounded">
              {dice}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Dados:</label>
          <div className="flex items-center">
            <button
              onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
              className="w-8 h-8 rounded-l-lg bg-secondary border border-border hover:bg-primary/20 transition-colors"
            >
              -
            </button>
            <span className="w-10 h-8 flex items-center justify-center bg-secondary/50 border-y border-border font-medium">
              {diceCount}
            </span>
            <button
              onClick={() => setDiceCount(Math.min(10, diceCount + 1))}
              className="w-8 h-8 rounded-r-lg bg-secondary border border-border hover:bg-primary/20 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Mod:</label>
          <div className="flex items-center">
            <button
              onClick={() => setModifier(modifier - 1)}
              className="w-8 h-8 rounded-l-lg bg-secondary border border-border hover:bg-primary/20 transition-colors"
            >
              -
            </button>
            <span className="w-12 h-8 flex items-center justify-center bg-secondary/50 border-y border-border font-medium">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier(modifier + 1)}
              className="w-8 h-8 rounded-r-lg bg-secondary border border-border hover:bg-primary/20 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Roll Button */}
      <div className="flex justify-center">
        <button
          onClick={rollDice}
          disabled={isRolling}
          className={cn(
            'px-8 py-4 rounded-2xl font-display font-bold text-lg transition-all duration-300',
            'bg-gradient-to-br from-primary to-accent text-primary-foreground',
            'hover:shadow-glow-lg hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
            isRolling && 'animate-pulse'
          )}
        >
          {isRolling ? 'Rolando...' : `Rolar ${diceCount}${selectedDice}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`}
        </button>
      </div>

      {/* Result Display */}
      {currentResult && (
        <div
          className={cn(
            'text-center p-6 rounded-2xl glass-card animate-scale-in',
            isCritical && 'border-2 border-accent shadow-glow-xl',
            isFumble && 'border-2 border-destructive'
          )}
        >
          <div
            className={cn(
              'text-5xl font-display font-bold mb-2',
              isCritical && 'text-accent glow-text animate-glow-pulse',
              isFumble && 'text-destructive'
            )}
          >
            {isRolling ? '?' : currentResult.total}
          </div>
          {isCritical && (
            <div className="text-accent font-display text-xl mb-2 animate-glow-pulse">
              🎯 CRÍTICO!
            </div>
          )}
          {isFumble && (
            <div className="text-destructive font-display text-xl mb-2">
              💀 FALHA CRÍTICA!
            </div>
          )}
          <div className="text-muted-foreground text-sm">
            [{currentResult.rolls.join(' + ')}]
            {currentResult.modifier !== 0 && (
              <span>
                {' '}
                {currentResult.modifier > 0 ? '+' : ''}{currentResult.modifier}
              </span>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-sm text-muted-foreground mb-3">Histórico</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.slice(0, 5).map((roll) => (
              <div
                key={roll.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm"
              >
                <span className="text-muted-foreground">
                  {roll.count}{roll.dice}
                  {roll.modifier !== 0 && (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier)}
                </span>
                <span className="text-foreground font-medium">{roll.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
