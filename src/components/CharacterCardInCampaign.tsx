import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDiscord } from '@/contexts/DiscordContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Character {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  attribute_int: number;
  attribute_agi: number;
  attribute_for: number;
  attribute_pre: number;
  attribute_vig: number;
  skills: Array<{ name: string; base: number; bonus: number; total: number }>;
}

// Perícias oficiais de Ordem Paranormal com seus atributos
const skillToAttribute: Record<string, 'INT' | 'AGI' | 'FOR' | 'PRE' | 'VIG'> = {
  'Acrobacias': 'AGI',
  'Adestramento': 'PRE',
  'Artes': 'PRE',
  'Atletismo': 'FOR',
  'Atualidades': 'INT',
  'Ciências': 'INT',
  'Crime': 'AGI',
  'Diplomacia': 'PRE',
  'Enganação': 'PRE',
  'Fortitude': 'VIG',
  'Furtividade': 'AGI',
  'Iniciativa': 'AGI',
  'Intimidação': 'PRE',
  'Intuição': 'PRE',
  'Investigação': 'INT',
  'Luta': 'FOR',
  'Medicina': 'INT',
  'Ocultismo': 'INT',
  'Percepção': 'PRE',
  'Pilotagem': 'AGI',
  'Pontaria': 'AGI',
  'Profissão': 'INT',
  'Reflexos': 'AGI',
  'Religião': 'PRE',
  'Sobrevivência': 'INT',
  'Tática': 'INT',
  'Tecnologia': 'INT',
  'Vontade': 'PRE',
};

const normalizeSkillName = (skillName: string): string => {
  const skillNameNormalization: Record<string, string> = {
    'Acrobacia': 'Acrobacias',
    'Sobrevivencia': 'Sobrevivência',
  };
  if (skillNameNormalization[skillName]) {
    return skillNameNormalization[skillName];
  }
  if (skillToAttribute[skillName]) {
    return skillName;
  }
  const normalized = Object.keys(skillToAttribute).find(
    key => key.toLowerCase() === skillName.toLowerCase()
  );
  return normalized || skillName;
};

const officialSkills = Object.keys(skillToAttribute).sort();

interface CharacterCardInCampaignProps {
  character: Character;
  campaignCharacterId: string;
  category: 'protagonist' | 'npc' | 'team' | 'enemy';
  teamName?: string | null;
  onRemove: () => void;
  onCategoryChange: (category: 'protagonist' | 'npc' | 'team' | 'enemy', teamName?: string) => void;
}

export function CharacterCardInCampaign({
  character,
  campaignCharacterId,
  category,
  teamName,
  campaignId,
  onRemove,
  onCategoryChange,
}: CharacterCardInCampaignProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<'attributes' | 'skills' | 'habilities' | 'combat'>('attributes');
  const [isRolling, setIsRolling] = useState(false);
  const [characterWeapons, setCharacterWeapons] = useState<Array<{
    id: string;
    weapon: {
      id: string;
      name: string;
      category: string;
      type: string;
      damage: string;
      modifier: string | null;
      range: string | null;
      image_url: string | null;
      multiplier_crit: string | null;
    };
    equipped: boolean;
  }>>([]);
  const [characterItems, setCharacterItems] = useState<Array<{
    id: string;
    item: {
      id: string;
      name: string;
      category: string;
      effect: string | null;
      image_url: string | null;
    };
    quantity: number;
    equipped: boolean;
  }>>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [showWeaponEquipDialog, setShowWeaponEquipDialog] = useState(false);
  const [showItemEquipDialog, setShowItemEquipDialog] = useState(false);
  const [pressingWeaponId, setPressingWeaponId] = useState<string | null>(null);
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);
  const [critProgress, setCritProgress] = useState(0);
  const pressTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [availableWeapons, setAvailableWeapons] = useState<Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    damage: string;
    modifier: string | null;
    range: string | null;
    image_url: string | null;
  }>>([]);
  const [availableItems, setAvailableItems] = useState<Array<{
    id: string;
    name: string;
    category: string;
    effect: string | null;
    image_url: string | null;
  }>>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const { toast } = useToast();
  const { isDiscordEnabled, addRollToHistory } = useDiscord();

  // Fetch character equipment when card is flipped or character changes
  useEffect(() => {
    if (isFlipped) {
      fetchCharacterEquipment();
    }
  }, [isFlipped, character.id]);

  const fetchCharacterEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      // Fetch weapons
      const { data: weaponsData } = await supabase
        .from('character_weapons')
        .select(`
          id,
          equipped,
          weapon:weapons(id, name, category, type, damage, modifier, range, image_url, multiplier_crit)
        `)
        .eq('character_id', character.id);

      // Fetch items
      const { data: itemsData } = await supabase
        .from('character_items')
        .select(`
          id,
          quantity,
          equipped,
          item:items(id, name, category, effect, image_url)
        `)
        .eq('character_id', character.id);

      setCharacterWeapons(weaponsData?.map((cw: any) => ({
        id: cw.id,
        weapon: cw.weapon,
        equipped: cw.equipped,
      })) || []);

      setCharacterItems(itemsData?.map((ci: any) => ({
        id: ci.id,
        item: ci.item,
        quantity: ci.quantity,
        equipped: ci.equipped,
      })) || []);
    } catch (error: any) {
      console.error('Error fetching equipment:', error);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const fetchAvailableWeapons = async () => {
    setIsLoadingAvailable(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weapons')
        .select('id, name, category, type, damage, modifier, range, image_url, multiplier_crit')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('name');

      if (error) throw error;
      setAvailableWeapons(data || []);
    } catch (error: any) {
      console.error('Error fetching available weapons:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar armas disponíveis',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const fetchAvailableItems = async () => {
    setIsLoadingAvailable(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('items')
        .select('id, name, category, effect, image_url')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('name');

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error: any) {
      console.error('Error fetching available items:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar itens disponíveis',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleEquipWeapon = async (weaponId: string) => {
    try {
      const existing = characterWeapons.find(cw => cw.weapon.id === weaponId);
      
      if (existing) {
        const { error } = await supabase
          .from('character_weapons')
          .update({ equipped: !existing.equipped })
          .eq('id', existing.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: existing.equipped ? 'Arma desequipada' : 'Arma equipada',
        });
      } else {
        const { error } = await supabase
          .from('character_weapons')
          .insert({
            character_id: character.id,
            weapon_id: weaponId,
            equipped: true,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Arma equipada',
        });
      }

      setShowWeaponEquipDialog(false);
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error equipping weapon:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao equipar arma',
        variant: 'destructive',
      });
    }
  };

  const handleEquipItem = async (itemId: string, quantity: number = 1) => {
    try {
      const existing = characterItems.find(ci => ci.item.id === itemId);
      
      if (existing) {
        const { error } = await supabase
          .from('character_items')
          .update({ 
            quantity: existing.quantity + quantity,
            equipped: !existing.equipped 
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: `Item ${existing.equipped ? 'desequipado' : 'equipado'}`,
        });
      } else {
        const { error } = await supabase
          .from('character_items')
          .insert({
            character_id: character.id,
            item_id: itemId,
            quantity: quantity,
            equipped: true,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Item equipado',
        });
      }

      setShowItemEquipDialog(false);
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error equipping item:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao equipar item',
        variant: 'destructive',
      });
    }
  };

  const handleUnequipWeapon = async (characterWeaponId: string) => {
    try {
      const { error } = await supabase
        .from('character_weapons')
        .delete()
        .eq('id', characterWeaponId);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Arma removida',
      });
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error removing weapon:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover arma',
        variant: 'destructive',
      });
    }
  };

  const handleUnequipItem = async (characterItemId: string) => {
    try {
      const { error } = await supabase
        .from('character_items')
        .delete()
        .eq('id', characterItemId);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Item removido',
      });
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover item',
        variant: 'destructive',
      });
    }
  };

  // Parse damage string (e.g., "2d6+2" or "1d4")
  const parseDamage = (damageStr: string): { dice: number; sides: number; modifier: number } => {
    const match = damageStr.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) return { dice: 1, sides: 20, modifier: 0 };
    return {
      dice: parseInt(match[1], 10),
      sides: parseInt(match[2], 10),
      modifier: match[3] ? parseInt(match[3], 10) : 0,
    };
  };

  // Roll damage
  const rollDamage = async (weapon: typeof characterWeapons[0]['weapon'], isCritical: boolean = false) => {
    try {
      setIsRolling(true);
      const damageInfo = parseDamage(weapon.damage);
      
      let diceCount = damageInfo.dice;
      let modifier = damageInfo.modifier;
      
      if (isCritical && weapon.multiplier_crit) {
        const multiplier = parseInt(weapon.multiplier_crit.replace('x', ''), 10) || 2;
        diceCount = diceCount * multiplier;
        modifier = modifier * multiplier;
      }
      
      // Generate cryptographically secure random rolls
      const rolls: number[] = [];
      const array = new Uint32Array(diceCount);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < diceCount; i++) {
        const roll = (array[i] % damageInfo.sides) + 1;
        rolls.push(roll);
      }
      
      const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;
      const formula = isCritical 
        ? `${diceCount}d${damageInfo.sides}${modifier > 0 ? `+${modifier}` : ''} (Crítico ${weapon.multiplier_crit})`
        : `${diceCount}d${damageInfo.sides}${modifier > 0 ? `+${modifier}` : ''}`;
      
      let sentToDiscord = false;
      
      // Send to Discord if enabled
      if (isDiscordEnabled) {
        try {
          const response = await fetch('/api/discord/roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterName: character.name,
              rollType: 'Dano',
              rollName: weapon.name,
              rolls,
              total,
              formula,
              isCritical,
            }),
          });
          
          if (response.ok) {
            sentToDiscord = true;
          }
        } catch (error) {
          console.error('Discord roll error:', error);
        }
      }
      
      // Add to history (with campaignId)
      addRollToHistory({
        characterName: character.name,
        skillName: weapon.name,
        attribute: 'Dano',
        rolls,
        total,
        formula,
        sentToDiscord,
        campaignId: campaignId || null,
        isAttributeRoll: false,
      });
      
      toast({
        title: isCritical ? 'Crítico!' : 'Dano',
        description: `${weapon.name}: ${total} (${formula})`,
      });
    } catch (error: any) {
      console.error('Roll error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível realizar a rolagem',
        variant: 'destructive',
      });
    } finally {
      setIsRolling(false);
    }
  };

  // Handle weapon button press
  const handleWeaponPressStart = (weaponId: string) => {
    setPressingWeaponId(weaponId);
    setPressStartTime(Date.now());
    setCritProgress(0);
    
    // Start progress animation
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 1200) * 100, 100);
      setCritProgress(progress);
      
      if (elapsed >= 1200) {
        clearInterval(interval);
      }
    }, 50);
    
    // Set timeout for critical (1.2 seconds)
    pressTimeoutRef.current = setTimeout(() => {
      const weapon = characterWeapons.find(cw => cw.weapon.id === weaponId);
      if (weapon) {
        rollDamage(weapon.weapon, true);
      }
      setPressingWeaponId(null);
      setPressStartTime(null);
      setCritProgress(0);
      clearInterval(interval);
    }, 1200);
  };

  const handleWeaponPressEnd = (weaponId: string) => {
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
    
    if (pressStartTime && Date.now() - pressStartTime < 1200) {
      // Normal roll
      const weapon = characterWeapons.find(cw => cw.weapon.id === weaponId);
      if (weapon) {
        rollDamage(weapon.weapon, false);
      }
    }
    
    setPressingWeaponId(null);
    setPressStartTime(null);
    setCritProgress(0);
  };

  // Get attribute value by name
  const getAttributeValue = (attr: 'INT' | 'AGI' | 'FOR' | 'PRE' | 'VIG'): number => {
    switch (attr) {
      case 'INT': return character.attribute_int;
      case 'AGI': return character.attribute_agi;
      case 'FOR': return character.attribute_for;
      case 'PRE': return character.attribute_pre;
      case 'VIG': return character.attribute_vig;
    }
  };

  // Get skill bonus from character skills
  const getSkillBonus = (skillName: string): number => {
    const normalizedName = normalizeSkillName(skillName);
    const skill = character.skills?.find(s => normalizeSkillName(s.name) === normalizedName);
    return skill ? skill.total : 0;
  };

  // Prepare all skills with their values
  const allSkills = officialSkills.map(skillName => {
    const attribute = skillToAttribute[skillName];
    const attrValue = getAttributeValue(attribute);
    const bonus = getSkillBonus(skillName);
    const isTrained = bonus > 0;

    return {
      name: skillName,
      attribute,
      attrValue,
      bonus,
      isTrained,
      displayValue: isTrained ? `${attrValue}#d20+${bonus}` : `${attrValue}#d20`
    };
  });

  // Separate trained and untrained skills
  const trainedSkills = allSkills.filter(s => s.isTrained).sort((a, b) => a.name.localeCompare(b.name));
  const untrainedSkills = allSkills.filter(s => !s.isTrained).sort((a, b) => a.name.localeCompare(b.name));

  // Handle attribute roll (pure attribute, no bonus)
  const handleAttributeRoll = async (attribute: 'INT' | 'AGI' | 'FOR' | 'PRE' | 'VIG', attrValue: number) => {
    if (isRolling) return;

    setIsRolling(true);

    try {
      // Roll dice: attrValue#d20 (no modifier)
      const rolls: number[] = [];
      for (let i = 0; i < attrValue; i++) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        rolls.push((array[0] % 20) + 1);
      }

      const total = Math.max(...rolls); // Take highest roll

      addRollToHistory({
        characterName: character.name,
        skillName: attribute, // Use attribute name as skill name for attribute rolls
        attribute: attribute,
        rolls,
        total,
        formula: `${attrValue}#d20`,
        sentToDiscord: false,
        campaignId: campaignId || null,
        isAttributeRoll: true,
      });

      if (isDiscordEnabled) {
        try {
          const response = await fetch('/api/discord/roll', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              characterName: character.name,
              skillName: attribute,
              attribute: attribute,
              rollFormula: `${attrValue}#d20`,
              isCombat: false,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            addRollToHistory({
              characterName: character.name,
              skillName: attribute,
              attribute: attribute,
              rolls,
              total,
              formula: `${attrValue}#d20`,
              sentToDiscord: true,
              campaignId: campaignId || null,
              isAttributeRoll: true,
            });
          }
        } catch (error: any) {
          console.error('Discord roll error:', error);
        }
      }
    } catch (error: any) {
      console.error('Roll error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível realizar a rolagem',
        variant: 'destructive',
      });
    } finally {
      setIsRolling(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="tab"]') || target.closest('[role="tablist"]') || target.closest('select') || target.closest('img[src="/Dice.png"]')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  // Handle Discord dice roll
  const handleDiscordRoll = async (skill: { name: string; attribute: string; attrValue: number; bonus: number; displayValue: string }) => {
    if (isRolling) return;

    setIsRolling(true);

    try {
      const formulaMatch = skill.displayValue.match(/(\d+)?#?d(\d+)([+-]\d+)?/);
      if (!formulaMatch) {
        throw new Error('Fórmula de rolagem inválida');
      }

      const diceCount = formulaMatch[1] ? parseInt(formulaMatch[1]) : 1;
      const sides = parseInt(formulaMatch[2]);
      const modifier = formulaMatch[3] ? parseInt(formulaMatch[3]) : 0;

      // Roll dice locally using cryptographically secure random
      const rolls: number[] = [];
      for (let i = 0; i < diceCount; i++) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        rolls.push((array[0] % sides) + 1);
      }

      const total = Math.max(...rolls) + modifier;

      addRollToHistory({
        characterName: character.name,
        skillName: skill.name,
        attribute: skill.attribute,
        rolls,
        total,
        formula: skill.displayValue,
        sentToDiscord: false,
        campaignId: campaignId || null,
        isAttributeRoll: false,
      });

      if (isDiscordEnabled) {
        try {
          const response = await fetch('/api/discord/roll', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              characterName: character.name,
              skillName: skill.name,
              attribute: skill.attribute,
              rollFormula: skill.displayValue,
              isCombat: false,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            addRollToHistory({
              characterName: character.name,
              skillName: skill.name,
              attribute: skill.attribute,
              rolls,
              total,
              formula: skill.displayValue,
              sentToDiscord: true,
              campaignId: campaignId || null,
              isAttributeRoll: false,
            });
          } else {
            throw new Error(data.error || 'Erro ao enviar rolagem para Discord');
          }
        } catch (error: any) {
          console.error('Discord roll error:', error);
        }
      }
    } catch (error: any) {
      console.error('Roll error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível realizar a rolagem',
        variant: 'destructive',
      });
    } finally {
      setIsRolling(false);
    }
  };

  const categoryLabels = {
    protagonist: 'Protagonista',
    npc: 'NPC',
    team: 'Equipa',
    enemy: 'Inimigo',
  };

  return (
    <div
      className={cn(
        "flip-card cursor-pointer",
        isFlipped && "flip-card-active"
      )}
      style={{ width: '250px', height: '390px' }}
      onClick={handleCardClick}
    >
      <div className={cn(
        "flip-card-inner",
        isFlipped && "flip-card-flipped"
      )}>
        {/* Front of Card - Image and Name */}
        <div className="flip-card-front">
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden min-h-0">
              {character.image_url ? (
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                  <span className="text-6xl">👤</span>
                </div>
              )}
            </div>
            <div
              className="px-4 py-3 text-center border-t mt-auto flex-shrink-0"
              style={{
                borderColor: `hsl(var(--primary) / 0.3)`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              }}
            >
              <h3 className="font-display font-bold text-lg truncate" style={{ color: `hsl(var(--primary))` }}>
                {character.name}
              </h3>
              {category === 'team' && teamName && (
                <p className="text-xs text-muted-foreground mt-1">{teamName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Back of Card - Details */}
        <div className="flip-card-back">
          <div className="w-full h-full flex flex-col">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
              <div className="px-4 pt-2 pb-2 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="attributes" className="text-xs">ATB</TabsTrigger>
                  <TabsTrigger value="skills" className="text-xs">PER</TabsTrigger>
                  <TabsTrigger value="habilities" className="text-xs">HAB</TabsTrigger>
                  <TabsTrigger value="combat" className="text-xs">COM</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-4 min-h-0">
                <TabsContent value="attributes" className="mt-0">
                  <div className="grid grid-cols-2 gap-3 items-center justify-items-center">
                    {/* INT */}
                    <div className="relative flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">INT</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttributeRoll('INT', character.attribute_int);
                        }}
                        disabled={isRolling}
                        className="relative cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rolar atributo puro"
                      >
                        <img
                          src="/Dice.png"
                          alt="Dice"
                          className="w-12 h-12 object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl attribute-number pointer-events-none"
                          style={{ color: `hsl(var(--primary))` }}
                        >
                          {character.attribute_int}
                        </span>
                      </button>
                    </div>

                    {/* AGI */}
                    <div className="relative flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">AGI</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttributeRoll('AGI', character.attribute_agi);
                        }}
                        disabled={isRolling}
                        className="relative cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rolar atributo puro"
                      >
                        <img
                          src="/Dice.png"
                          alt="Dice"
                          className="w-12 h-12 object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl attribute-number pointer-events-none"
                          style={{ color: `hsl(var(--primary))` }}
                        >
                          {character.attribute_agi}
                        </span>
                      </button>
                    </div>

                    {/* FOR */}
                    <div className="relative flex flex-col items-center col-span-2">
                      <span className="text-xs text-muted-foreground mb-1">FOR</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttributeRoll('FOR', character.attribute_for);
                        }}
                        disabled={isRolling}
                        className="relative cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rolar atributo puro"
                      >
                        <img
                          src="/Dice.png"
                          alt="Dice"
                          className="w-12 h-12 object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl attribute-number pointer-events-none"
                          style={{ color: `hsl(var(--primary))` }}
                        >
                          {character.attribute_for}
                        </span>
                      </button>
                    </div>

                    {/* PRE */}
                    <div className="relative flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">PRE</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttributeRoll('PRE', character.attribute_pre);
                        }}
                        disabled={isRolling}
                        className="relative cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rolar atributo puro"
                      >
                        <img
                          src="/Dice.png"
                          alt="Dice"
                          className="w-12 h-12 object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl attribute-number pointer-events-none"
                          style={{ color: `hsl(var(--primary))` }}
                        >
                          {character.attribute_pre}
                        </span>
                      </button>
                    </div>

                    {/* VIG */}
                    <div className="relative flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">VIG</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttributeRoll('VIG', character.attribute_vig);
                        }}
                        disabled={isRolling}
                        className="relative cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rolar atributo puro"
                      >
                        <img
                          src="/Dice.png"
                          alt="Dice"
                          className="w-12 h-12 object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl attribute-number pointer-events-none"
                          style={{ color: `hsl(var(--primary))` }}
                        >
                          {character.attribute_vig}
                        </span>
                      </button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="mt-0">
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {trainedSkills.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-primary mb-1.5 sticky top-0 bg-background/95 py-1">
                          Treinadas
                        </div>
                        {trainedSkills.map((skill) => (
                          <div key={skill.name} className="flex justify-between items-center p-1.5 bg-secondary/30 rounded text-xs gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscordRoll(skill);
                                }}
                                disabled={isRolling}
                                className="w-4 h-4 flex-shrink-0 p-0 border-0 bg-transparent cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isRolling ? "Enviando..." : "Rolar dado"}
                              >
                                <img
                                  src="/d20.png"
                                  alt="d20"
                                  className="w-full h-full skill-dice-icon pointer-events-none"
                                />
                              </button>
                              <span className="font-medium truncate">{skill.name}</span>
                            </div>
                            <span className="font-bold font-mono flex-shrink-0" style={{ color: `hsl(var(--primary))` }}>
                              {skill.displayValue}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    {trainedSkills.length > 0 && untrainedSkills.length > 0 && (
                      <div className="border-t border-border/30 my-2"></div>
                    )}

                    {untrainedSkills.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-background/95 py-1">
                          Outras
                        </div>
                        {untrainedSkills.map((skill) => (
                          <div key={skill.name} className="flex justify-between items-center p-1.5 bg-secondary/20 rounded text-xs opacity-75 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscordRoll(skill);
                                }}
                                disabled={isRolling}
                                className="w-4 h-4 flex-shrink-0 p-0 border-0 bg-transparent cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isRolling ? "Enviando..." : "Rolar dado"}
                              >
                                <img
                                  src="/d20.png"
                                  alt="d20"
                                  className="w-full h-full skill-dice-icon pointer-events-none"
                                />
                              </button>
                              <span className="font-medium truncate">{skill.name}</span>
                            </div>
                            <span className="font-bold font-mono flex-shrink-0" style={{ color: `hsl(var(--primary) / 0.7)` }}>
                              {skill.displayValue}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="habilities" className="mt-0">
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-4">
                      {/* Habilidades Section */}
                      {character.description && (
                        <>
                          <div className="text-xs font-semibold text-primary mb-2">Habilidades</div>
                          <p className="text-xs text-muted-foreground mb-4">{character.description}</p>
                        </>
                      )}

                      {/* Items Section */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-primary">Itens</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchAvailableItems();
                            setShowItemEquipDialog(true);
                          }}
                        >
                          + Equipar
                        </Button>
                      </div>
                      {characterItems.length > 0 ? (
                        <div className="space-y-2">
                          {characterItems.map((ci) => (
                            <div key={ci.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded text-xs">
                              {ci.item.image_url && (
                                <img
                                  src={ci.item.image_url}
                                  alt={ci.item.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{ci.item.name}</div>
                                {ci.item.effect && (
                                  <div className="text-[10px] text-primary">{ci.item.effect}</div>
                                )}
                                {ci.quantity > 1 && (
                                  <div className="text-[10px] text-muted-foreground">x{ci.quantity}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {ci.equipped && (
                                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                    Equipado
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnequipItem(ci.id);
                                  }}
                                  title="Remover item"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhum item equipado. Clique em "+ Equipar" para adicionar.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="combat" className="mt-0">
                  <ScrollArea className="h-[280px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-primary">Armas</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchAvailableWeapons();
                          setShowWeaponEquipDialog(true);
                        }}
                      >
                        + Equipar
                      </Button>
                    </div>
                    {isLoadingEquipment ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">Carregando...</div>
                    ) : characterWeapons.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        <p>Nenhuma arma equipada.</p>
                        <p className="mt-1">Clique em "+ Equipar" para adicionar.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {characterWeapons.map((cw) => {
                          const isPressing = pressingWeaponId === cw.weapon.id;
                          return (
                            <div key={cw.id} className="p-2 bg-secondary/30 rounded text-xs">
                              <div className="flex items-center gap-2">
                                {cw.weapon.image_url && (
                                  <img
                                    src={cw.weapon.image_url}
                                    alt={cw.weapon.name}
                                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold">{cw.weapon.name}</div>
                                  <div className="text-[10px] text-primary font-semibold mt-0.5">
                                    {cw.weapon.damage}
                                  </div>
                                </div>
                                <div className="relative flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className={cn(
                                      "h-8 px-3 text-xs font-bold relative overflow-hidden",
                                      isPressing && "animate-pulse"
                                    )}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      handleWeaponPressStart(cw.weapon.id);
                                    }}
                                    onMouseUp={(e) => {
                                      e.stopPropagation();
                                      handleWeaponPressEnd(cw.weapon.id);
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation();
                                      handleWeaponPressEnd(cw.weapon.id);
                                    }}
                                    onTouchStart={(e) => {
                                      e.stopPropagation();
                                      handleWeaponPressStart(cw.weapon.id);
                                    }}
                                    onTouchEnd={(e) => {
                                      e.stopPropagation();
                                      handleWeaponPressEnd(cw.weapon.id);
                                    }}
                                    disabled={isRolling}
                                    title={isPressing ? "Mantenha pressionado para crítico..." : "Clique para rolar dano"}
                                  >
                                    {isPressing ? (
                                      <>
                                        <span className="relative z-10">⚡ {Math.round(critProgress)}%</span>
                                        <div
                                          className="absolute inset-0 bg-primary/50 transition-all duration-50"
                                          style={{ width: `${critProgress}%` }}
                                        />
                                      </>
                                    ) : (
                                      "🎲"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>

            {/* Name and actions at bottom */}
            <div
              className="px-4 py-3 border-t flex-shrink-0 flex items-center justify-between gap-2"
              style={{
                borderColor: `hsl(var(--primary) / 0.3)`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg truncate" style={{ color: `hsl(var(--primary))` }}>
                  {character.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      const newCategory = value as 'protagonist' | 'npc' | 'team' | 'enemy';
                      if (newCategory === 'team') {
                        const teamName = prompt('Nome da equipa:');
                        onCategoryChange(newCategory, teamName || undefined);
                      } else {
                        onCategoryChange(newCategory);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectTrigger className="h-6 text-xs w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="protagonist">Protagonista</SelectItem>
                      <SelectItem value="npc">NPC</SelectItem>
                      <SelectItem value="team">Equipa</SelectItem>
                      <SelectItem value="enemy">Inimigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Weapon Equip Dialog */}
      <Dialog open={showWeaponEquipDialog} onOpenChange={setShowWeaponEquipDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Equipar Arma</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isLoadingAvailable ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : availableWeapons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma arma disponível.</p>
                <p className="text-sm mt-2">Crie armas no inventário primeiro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableWeapons.map((weapon) => {
                  const isEquipped = characterWeapons.some(cw => cw.weapon.id === weapon.id);
                  return (
                    <div
                      key={weapon.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        isEquipped
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEquipWeapon(weapon.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {weapon.image_url && (
                          <img
                            src={weapon.image_url}
                            alt={weapon.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{weapon.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {weapon.type} • {weapon.damage}
                            {weapon.modifier && ` ${weapon.modifier}`}
                          </div>
                        </div>
                        {isEquipped && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Equipada
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Item Equip Dialog */}
      <Dialog open={showItemEquipDialog} onOpenChange={setShowItemEquipDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Equipar Item</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isLoadingAvailable ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : availableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum item disponível.</p>
                <p className="text-sm mt-2">Crie itens no inventário primeiro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableItems.map((item) => {
                  const isEquipped = characterItems.some(ci => ci.item.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        isEquipped
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEquipItem(item.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{item.name}</div>
                          {item.effect && (
                            <div className="text-xs text-primary">{item.effect}</div>
                          )}
                        </div>
                        {isEquipped && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Equipado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
