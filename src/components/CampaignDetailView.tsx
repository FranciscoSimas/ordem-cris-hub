import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDiscord } from '@/contexts/DiscordContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, ExternalLink } from 'lucide-react';
import { CharacterCardInCampaign } from './CharacterCardInCampaign';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  main_protagonists_count: number;
  characters: string[];
  documents: Array<{ name: string; url: string }>;
  master_user_id: string;
}

interface CampaignCharacter {
  id: string;
  campaign_id: string;
  character_id: string;
  category: 'protagonist' | 'npc' | 'team' | 'enemy';
  team_name: string | null;
  notes: string | null;
  character: {
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
  };
}

interface CampaignSession {
  id: string;
  campaign_id: string;
  session_number: number;
  title: string | null;
  description: string | null;
  session_date: string | null;
  notes: string | null;
  created_at: string;
}

interface CampaignDetailViewProps {
  campaignId: string;
  onBack: () => void;
}

export function CampaignDetailView({ campaignId, onBack }: CampaignDetailViewProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignCharacters, setCampaignCharacters] = useState<CampaignCharacter[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'characters' | 'documents' | 'history' | 'sessions'>('characters');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCharacterDialog, setShowAddCharacterDialog] = useState(false);
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);
  const [newCharacterForm, setNewCharacterForm] = useState({
    character_id: '',
    category: 'npc' as 'protagonist' | 'npc' | 'team' | 'enemy',
    team_name: '',
    notes: '',
  });
  const [newSessionForm, setNewSessionForm] = useState({
    session_number: 1,
    title: '',
    description: '',
    session_date: '',
    notes: '',
  });
  const [rollTypeFilter, setRollTypeFilter] = useState<'all' | 'skill' | 'combat'>('all');
  const { toast } = useToast();
  const { rollHistory } = useDiscord();

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  // Recalculate campaign roll history when rollHistory changes
  useEffect(() => {
    // This will trigger a re-render when rollHistory updates
  }, [rollHistory]);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch campaign characters with character details
      const { data: ccData, error: ccError } = await supabase
        .from('campaign_characters')
        .select(`
          *,
          character:characters(*)
        `)
        .eq('campaign_id', campaignId)
        .order('category', { ascending: true });

      if (ccError) throw ccError;
      setCampaignCharacters(ccData || []);

      // Fetch all available characters (for adding to campaign)
      const { data: allChars, error: allCharsError } = await supabase
        .from('characters')
        .select('*')
        .order('name');

      if (allCharsError) throw allCharsError;
      setAllCharacters(allChars || []);

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('campaign_sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
    } catch (error: any) {
      console.error('Error fetching campaign data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da campanha.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCharacter = async () => {
    if (!newCharacterForm.character_id) {
      toast({
        title: 'Erro',
        description: 'Selecione um personagem.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('campaign_characters')
        .insert({
          campaign_id: campaignId,
          character_id: newCharacterForm.character_id,
          category: newCharacterForm.category,
          team_name: newCharacterForm.team_name || null,
          notes: newCharacterForm.notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Personagem adicionado à campanha!',
      });

      setShowAddCharacterDialog(false);
      setNewCharacterForm({
        character_id: '',
        category: 'npc',
        team_name: '',
        notes: '',
      });
      fetchCampaignData();
    } catch (error: any) {
      console.error('Error adding character:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar o personagem.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveCharacter = async (id: string) => {
    if (!confirm('Remover este personagem da campanha?')) return;

    try {
      const { error } = await supabase
        .from('campaign_characters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Personagem removido da campanha.',
      });

      fetchCampaignData();
    } catch (error: any) {
      console.error('Error removing character:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o personagem.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCharacterCategory = async (id: string, category: 'protagonist' | 'npc' | 'team' | 'enemy', teamName?: string) => {
    try {
      const { error } = await supabase
        .from('campaign_characters')
        .update({
          category,
          team_name: category === 'team' ? teamName || null : null,
        })
        .eq('id', id);

      if (error) throw error;

      fetchCampaignData();
    } catch (error: any) {
      console.error('Error updating character category:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a categoria.',
        variant: 'destructive',
      });
    }
  };

  const handleAddSession = async () => {
    try {
      // Get next session number
      const nextNumber = sessions.length > 0 
        ? Math.max(...sessions.map(s => s.session_number)) + 1
        : 1;

      const { error } = await supabase
        .from('campaign_sessions')
        .insert({
          campaign_id: campaignId,
          session_number: newSessionForm.session_number || nextNumber,
          title: newSessionForm.title || null,
          description: newSessionForm.description || null,
          session_date: newSessionForm.session_date || null,
          notes: newSessionForm.notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Sessão criada!',
      });

      setShowAddSessionDialog(false);
      setNewSessionForm({
        session_number: nextNumber + 1,
        title: '',
        description: '',
        session_date: '',
        notes: '',
      });
      fetchCampaignData();
    } catch (error: any) {
      console.error('Error adding session:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a sessão.',
        variant: 'destructive',
      });
    }
  };

  // Filter characters by category and search
  const filteredCharacters = campaignCharacters.filter(cc => {
    if (selectedCategory !== 'all' && cc.category !== selectedCategory) return false;
    if (searchQuery && !cc.character.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter roll history by campaign ID (only rolls made within this campaign)
  const campaignRollHistory = rollHistory.filter(roll => {
    // Only show rolls that were made within this campaign
    if (roll.campaignId !== campaignId) return false;
    
    // Filter by type
    if (rollTypeFilter === 'combat') {
      // TODO: Add combat detection when combat rolls are implemented
      return false;
    }
    if (rollTypeFilter === 'skill') {
      // Show skills and attribute rolls
      return !roll.isAttributeRoll || false; // For now, show attribute rolls in "all"
    }
    
    return true; // 'all' - show everything (skills and attributes)
  });

  // Group characters by category
  const charactersByCategory = {
    protagonist: filteredCharacters.filter(cc => cc.category === 'protagonist'),
    npc: filteredCharacters.filter(cc => cc.category === 'npc'),
    team: filteredCharacters.filter(cc => cc.category === 'team'),
    enemy: filteredCharacters.filter(cc => cc.category === 'enemy'),
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando campanha...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campanha não encontrada.</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold glow-text">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="characters">Personagens</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
        </TabsList>

        {/* Characters Tab */}
        <TabsContent value="characters" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar personagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="protagonist">Protagonistas</SelectItem>
                  <SelectItem value="npc">NPCs</SelectItem>
                  <SelectItem value="team">Equipas</SelectItem>
                  <SelectItem value="enemy">Inimigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={showAddCharacterDialog} onOpenChange={setShowAddCharacterDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Personagem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Personagem à Campanha</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Personagem</Label>
                    <Select
                      value={newCharacterForm.character_id}
                      onValueChange={(value) => setNewCharacterForm({ ...newCharacterForm, character_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um personagem" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCharacters
                          .filter(char => !campaignCharacters.some(cc => cc.character_id === char.id))
                          .map((char) => (
                            <SelectItem key={char.id} value={char.id}>
                              {char.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={newCharacterForm.category}
                      onValueChange={(value) => setNewCharacterForm({ ...newCharacterForm, category: value as any })}
                    >
                      <SelectTrigger>
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
                  {newCharacterForm.category === 'team' && (
                    <div>
                      <Label>Nome da Equipa</Label>
                      <Input
                        value={newCharacterForm.team_name}
                        onChange={(e) => setNewCharacterForm({ ...newCharacterForm, team_name: e.target.value })}
                        placeholder="Ex: Equipa Alpha"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={newCharacterForm.notes}
                      onChange={(e) => setNewCharacterForm({ ...newCharacterForm, notes: e.target.value })}
                      placeholder="Notas sobre este personagem na campanha..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddCharacterDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddCharacter}>
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Characters by Category */}
          <div className="space-y-6">
            {/* Protagonistas */}
            {charactersByCategory.protagonist.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Protagonistas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {charactersByCategory.protagonist.map((cc) => (
                    <CharacterCardInCampaign
                      key={cc.id}
                      character={cc.character}
                      campaignCharacterId={cc.id}
                      category={cc.category}
                      campaignId={campaignId}
                      onRemove={() => handleRemoveCharacter(cc.id)}
                      onCategoryChange={(cat, teamName) => handleUpdateCharacterCategory(cc.id, cat, teamName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* NPCs */}
            {charactersByCategory.npc.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">NPCs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {charactersByCategory.npc.map((cc) => (
                    <CharacterCardInCampaign
                      key={cc.id}
                      character={cc.character}
                      campaignCharacterId={cc.id}
                      category={cc.category}
                      campaignId={campaignId}
                      onRemove={() => handleRemoveCharacter(cc.id)}
                      onCategoryChange={(cat, teamName) => handleUpdateCharacterCategory(cc.id, cat, teamName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Equipas */}
            {charactersByCategory.team.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Equipas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {charactersByCategory.team.map((cc) => (
                    <CharacterCardInCampaign
                      key={cc.id}
                      character={cc.character}
                      campaignCharacterId={cc.id}
                      category={cc.category}
                      teamName={cc.team_name}
                      campaignId={campaignId}
                      onRemove={() => handleRemoveCharacter(cc.id)}
                      onCategoryChange={(cat, teamName) => handleUpdateCharacterCategory(cc.id, cat, teamName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inimigos */}
            {charactersByCategory.enemy.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Inimigos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {charactersByCategory.enemy.map((cc) => (
                    <CharacterCardInCampaign
                      key={cc.id}
                      character={cc.character}
                      campaignCharacterId={cc.id}
                      category={cc.category}
                      campaignId={campaignId}
                      onRemove={() => handleRemoveCharacter(cc.id)}
                      onCategoryChange={(cat, teamName) => handleUpdateCharacterCategory(cc.id, cat, teamName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredCharacters.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum personagem encontrado.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="space-y-3">
            {campaign.documents && campaign.documents.length > 0 ? (
              campaign.documents.map((doc, index) => (
                <div key={index} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{doc.name || `Documento ${index + 1}`}</h4>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        {doc.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum documento adicionado ainda.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Histórico de Rolagens</h3>
            <Select value={rollTypeFilter} onValueChange={(value) => setRollTypeFilter(value as 'all' | 'skill' | 'combat')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="skill">Perícias</SelectItem>
                <SelectItem value="combat">Combate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 pr-2">
              {campaignRollHistory.length > 0 ? (
                [...campaignRollHistory].reverse().map((roll) => (
                  <div
                    key={roll.id}
                    className={cn(
                      "p-3 rounded-lg text-sm border transition-colors",
                      roll.sentToDiscord
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-secondary/50 border-border/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-base">
                          {roll.characterName} - {roll.isAttributeRoll ? roll.attribute : roll.skillName}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {roll.attribute} • {roll.formula}
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm">
                            {roll.rolls.map((r, i) => (
                              <span 
                                key={i} 
                                className={cn(
                                  "inline-block mr-1",
                                  r === 20 && "text-green-400 font-extrabold",
                                  r === 1 && "text-red-400 font-extrabold"
                                )}
                              >
                                [{r}]
                              </span>
                            ))}
                          </span>
                          <span className="font-bold text-lg" style={{ color: `hsl(var(--primary))` }}>
                            → {roll.total}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                          <span>{roll.timestamp.toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                          {roll.sentToDiscord && (
                            <span className="text-green-400 font-semibold flex items-center gap-1">
                              ✓ Discord
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-4">🎲</div>
                  <p className="text-lg mb-2 font-semibold">Nenhuma rolagem ainda nesta campanha.</p>
                  <p className="text-sm">As rolagens dos personagens desta campanha aparecerão aqui automaticamente.</p>
                  {campaignCharacters.length === 0 && (
                    <p className="text-xs mt-2 text-muted-foreground/70">
                      Adicione personagens à campanha para ver suas rolagens aqui.
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddSessionDialog} onOpenChange={setShowAddSessionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Sessão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Sessão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Número da Sessão</Label>
                    <Input
                      type="number"
                      value={newSessionForm.session_number}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, session_number: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={newSessionForm.title}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, title: e.target.value })}
                      placeholder="Ex: A Descoberta do Templo"
                    />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newSessionForm.session_date}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, session_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={newSessionForm.description}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={newSessionForm.notes}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, notes: e.target.value })}
                      rows={4}
                      placeholder="Anotações da sessão..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddSessionDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddSession}>
                    Criar Sessão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Sessão {session.session_number}</span>
                        {session.title && (
                          <span className="text-muted-foreground">- {session.title}</span>
                        )}
                      </div>
                      {session.session_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(session.session_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {session.description && (
                        <p className="text-sm mt-2">{session.description}</p>
                      )}
                      {session.notes && (
                        <div className="mt-3 p-2 bg-secondary/50 rounded text-sm">
                          <strong>Notas:</strong>
                          <p className="mt-1 whitespace-pre-wrap">{session.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma sessão criada ainda.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

