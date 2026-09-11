import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { guestGet, guestSet, guestId, guestNow, GUEST_USER_ID } from '@/lib/guestStorage';

interface CampaignsSectionProps {
  onCampaignSelected?: (campaignId: string) => void;
}

interface Campaign {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  main_protagonists_count: number;
  characters: string[]; // Array de IDs de personagens
  documents: Array<{ name: string; url: string }>;
  master_user_id: string;
  created_at: string;
  updated_at: string;
}

interface Character {
  id: string;
  name: string;
  user_id: string;
}

interface User {
  id: string;
  display_name: string | null;
  email: string;
}

export function CampaignsSection({ onCampaignSelected }: CampaignsSectionProps = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const { toast } = useToast();

  // Load selected campaign from localStorage and profile on mount
  useEffect(() => {
    const loadSelectedCampaign = async () => {
      const localSelected = localStorage.getItem('selected-campaign-id');
      if (localSelected) {
        setSelectedCampaign(localSelected);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_campaign_id')
        .eq('id', user.id)
        .single();

      if (profile?.selected_campaign_id) {
        setSelectedCampaign(profile.selected_campaign_id);
        localStorage.setItem('selected-campaign-id', profile.selected_campaign_id);
      }
    };

    loadSelectedCampaign();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    main_protagonists_count: 1,
    selectedCharacters: [] as string[],
    documents: [] as Array<{ name: string; url: string }>,
    master_user_id: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchCharacters();
    fetchUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setFormData(prev => ({ ...prev, master_user_id: user.id }));
    } else {
      setCurrentUserId(GUEST_USER_ID);
      setFormData(prev => ({ ...prev, master_user_id: GUEST_USER_ID }));
    }
  };

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCampaigns(guestGet<Campaign[]>('campaigns', []));
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as campanhas.',
          variant: 'destructive',
        });
      } else {
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCharacters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const local = guestGet<Array<{ id: string; name: string; user_id: string }>>('characters', []);
        setCharacters(local.map((c) => ({ id: c.id, name: c.name, user_id: c.user_id })));
        return;
      }

      // Buscar personagens que o usuário pode ver (próprios ou com permissão)
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, user_id')
        .order('name');

      if (error) {
        console.error('Error fetching characters:', error);
      } else {
        setCharacters(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUsers([{ id: GUEST_USER_ID, display_name: 'Convidado', email: '' }]);
        return;
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name');

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        // Usar apenas profiles (email não é necessário para exibição)
        setUsers((profiles || []).map(p => ({
          id: p.id,
          display_name: p.display_name,
          email: '', // Email não disponível no cliente
        })));
      }
    } catch (error) {
      console.error('Error:', error);
      setUsers([]);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.master_user_id) {
      toast({
        title: 'Erro',
        description: 'Selecione um Mestre para a campanha.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const now = guestNow();
        const campaign: Campaign = {
          id: guestId(),
          user_id: GUEST_USER_ID,
          title: formData.title,
          description: formData.description || null,
          main_protagonists_count: formData.main_protagonists_count,
          characters: formData.selectedCharacters,
          documents: formData.documents,
          master_user_id: formData.master_user_id || GUEST_USER_ID,
          created_at: now,
          updated_at: now,
        };
        guestSet('campaigns', [campaign, ...guestGet<Campaign[]>('campaigns', [])]);
        toast({ title: 'Sucesso', description: 'Campanha criada com sucesso!' });
        setShowCreateDialog(false);
        resetForm();
        fetchCampaigns();
        return;
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          main_protagonists_count: formData.main_protagonists_count,
          characters: formData.selectedCharacters,
          documents: formData.documents,
          master_user_id: formData.master_user_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso!',
      });

      setShowCreateDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a campanha.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectCampaign = async (campaignId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const actorId = user?.id ?? GUEST_USER_ID;

      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Verificar se o usuário é o mestre da campanha
      if (campaign.master_user_id !== actorId) {
        toast({
          title: 'Acesso Negado',
          description: 'Apenas o Mestre da campanha pode selecioná-la.',
          variant: 'destructive',
        });
        return;
      }

      // Salvar no localStorage
      localStorage.setItem('selected-campaign-id', campaignId);

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ selected_campaign_id: campaignId })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      setSelectedCampaign(campaignId);
      toast({
        title: 'Campanha Selecionada',
        description: `Você está agora mestrando: ${campaign.title}`,
      });
      
      // Notificar o componente pai para mudar a view
      if (onCampaignSelected) {
        onCampaignSelected(campaignId);
      }
    } catch (error: any) {
      console.error('Error selecting campaign:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível selecionar a campanha.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      main_protagonists_count: 1,
      selectedCharacters: [],
      documents: [],
      master_user_id: currentUserId || '',
    });
  };

  const getMasterName = (masterId: string) => {
    const master = users.find(u => u.id === masterId);
    return master?.display_name || master?.email || 'Mestre Desconhecido';
  };

  const getCharacterName = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    return character?.name || 'Personagem Desconhecido';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold glow-text">Minhas Campanhas</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              + Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Os Segredos de São Paulo"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a campanha..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="main_protagonists">Nº Protagonistas Principais</Label>
                <Input
                  id="main_protagonists"
                  type="number"
                  min="1"
                  value={formData.main_protagonists_count}
                  onChange={(e) => setFormData({ ...formData, main_protagonists_count: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <Label>Mestre *</Label>
                <Select
                  value={formData.master_user_id}
                  onValueChange={(value) => setFormData({ ...formData, master_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Mestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name || user.email || user.id.substring(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Personagens no Universo/RP</Label>
                <ScrollArea className="h-48 border rounded-lg p-4">
                  {characters.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum personagem disponível. Crie personagens na seção de Personagens primeiro.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {characters.map((character) => (
                        <div key={character.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`char-${character.id}`}
                            checked={formData.selectedCharacters.includes(character.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  selectedCharacters: [...formData.selectedCharacters, character.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedCharacters: formData.selectedCharacters.filter(id => id !== character.id),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`char-${character.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {character.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div>
                <Label>Documentos</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Adicione documentos relacionados à campanha (links, notas, etc.)
                </p>
                <div className="space-y-2">
                  {formData.documents.map((doc, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome do documento"
                        value={doc.name}
                        onChange={(e) => {
                          const newDocs = [...formData.documents];
                          newDocs[index].name = e.target.value;
                          setFormData({ ...formData, documents: newDocs });
                        }}
                      />
                      <Input
                        placeholder="URL"
                        value={doc.url}
                        onChange={(e) => {
                          const newDocs = [...formData.documents];
                          newDocs[index].url = e.target.value;
                          setFormData({ ...formData, documents: newDocs });
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            documents: formData.documents.filter((_, i) => i !== index),
                          });
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        documents: [...formData.documents, { name: '', url: '' }],
                      });
                    }}
                  >
                    + Adicionar Documento
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCampaign}>
                Criar Campanha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 glass-card">
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <div className="text-6xl mb-4">📜</div>
          <h3 className="font-display text-xl mb-2">Nenhuma campanha encontrada</h3>
          <p className="text-muted-foreground mb-4">Crie uma nova campanha para começar</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const isMaster = campaign.master_user_id === currentUserId;
            const isSelected = selectedCampaign === campaign.id;

            return (
              <div
                key={campaign.id}
                className={cn(
                  "glass-card p-5 hover:border-primary/50 transition-all duration-300 cursor-pointer group",
                  isSelected && "border-primary border-2"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-2xl group-hover:shadow-glow transition-shadow">
                        📜
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">
                          {campaign.title}
                        </h3>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                          <span>🎭 Mestre: {getMasterName(campaign.master_user_id)}</span>
                          <span>👥 {campaign.main_protagonists_count} protagonista(s)</span>
                          <span>🎪 {campaign.characters.length} personagem(ns)</span>
                          {isSelected && <span className="text-primary font-semibold">✓ Selecionada</span>}
                        </div>
                        {campaign.characters.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-semibold">Personagens: </span>
                            {campaign.characters.map((charId, idx) => (
                              <span key={charId}>
                                {getCharacterName(charId)}
                                {idx < campaign.characters.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isMaster && (
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCampaign(campaign.id);
                        }}
                      >
                        {isSelected ? 'Selecionada' : 'Selecionar como Mestre'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
