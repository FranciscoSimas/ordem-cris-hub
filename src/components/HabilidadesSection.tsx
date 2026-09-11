import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { guestGet, guestSet, guestId, guestNow, GUEST_USER_ID, fileToDataUrl } from '@/lib/guestStorage';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Edit, Trash2, Upload, X, Plus } from 'lucide-react';

// Categorias de habilidades
const ABILITY_CATEGORIES = [
  { value: 'futurista', label: 'Futurista' },
  { value: 'medieval', label: 'Medieval' },
  { value: 'atual', label: 'Atual' },
  { value: 'generica', label: 'Genérica' },
  { value: 'magica', label: 'Mágica' },
  { value: 'tecnologica', label: 'Tecnológica' },
  { value: 'outra', label: 'Outra' },
] as const;

interface Ability {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string;
  effect: string | null;
  image_url: string | null;
  is_global: boolean;
  shared_users?: string[] | null; // Array de UUIDs de usuários com acesso
  created_at: string;
}

export function HabilidadesSection() {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAbility, setEditingAbility] = useState<Ability | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: 'generica',
    description: '',
    effect: '',
    image_url: null as string | null,
    is_global: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAbilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const local = guestGet<Ability[]>('abilities', []);
        setAbilities([...local].sort((a, b) => a.name.localeCompare(b.name)));
        return;
      }

      // Buscar habilidades: globais, próprias, ou compartilhadas com o usuário
      // A política RLS já filtra por shared_users no servidor
      const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('name');

      if (error) throw error;
      setAbilities(data || []);
    } catch (error: any) {
      console.error('Error fetching abilities:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar habilidades',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAbilities();
  }, [fetchAbilities]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const dataUrl = await fileToDataUrl(file);
        setForm({ ...form, image_url: dataUrl });
        toast({ title: 'Sucesso', description: 'Imagem carregada com sucesso' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `abilities/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setForm({ ...form, image_url: publicUrl });
      toast({
        title: 'Sucesso',
        description: 'Imagem carregada com sucesso',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao carregar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const list = guestGet<Ability[]>('abilities', []);
        if (editingAbility) {
          guestSet(
            'abilities',
            list.map((a) =>
              a.id === editingAbility.id
                ? {
                    ...a,
                    name: form.name,
                    category: form.category,
                    description: form.description,
                    effect: form.effect || null,
                    image_url: form.image_url,
                    is_global: form.is_global,
                  }
                : a
            )
          );
          toast({ title: 'Sucesso', description: 'Habilidade atualizada' });
        } else {
          const created: Ability = {
            id: guestId(),
            user_id: GUEST_USER_ID,
            name: form.name,
            category: form.category,
            description: form.description,
            effect: form.effect || null,
            image_url: form.image_url,
            is_global: form.is_global,
            created_at: guestNow(),
          };
          guestSet('abilities', [created, ...list]);
          toast({ title: 'Sucesso', description: 'Habilidade criada' });
        }
      } else if (editingAbility) {
        // Update
        const { error } = await supabase
          .from('abilities')
          .update({
            name: form.name,
            category: form.category,
            description: form.description,
            effect: form.effect || null,
            image_url: form.image_url,
            is_global: form.is_global,
          })
          .eq('id', editingAbility.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Habilidade atualizada',
        });
      } else {
        // Create
        const { error } = await supabase
          .from('abilities')
          .insert({
            user_id: user.id,
            name: form.name,
            category: form.category,
            description: form.description,
            effect: form.effect || null,
            image_url: form.image_url,
            is_global: form.is_global,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Habilidade criada',
        });
      }

      setShowDialog(false);
      resetForm();
      fetchAbilities();
    } catch (error: any) {
      console.error('Error saving ability:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar habilidade',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta habilidade?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        guestSet('abilities', guestGet<Ability[]>('abilities', []).filter((a) => a.id !== id));
      } else {
        const { error } = await supabase
          .from('abilities')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      toast({
        title: 'Sucesso',
        description: 'Habilidade deletada',
      });
      fetchAbilities();
    } catch (error: any) {
      console.error('Error deleting ability:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao deletar habilidade',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (ability: Ability) => {
    setEditingAbility(ability);
    setForm({
      name: ability.name,
      category: ability.category,
      description: ability.description,
      effect: ability.effect || '',
      image_url: ability.image_url,
      is_global: ability.is_global,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      category: 'generica',
      description: '',
      effect: '',
      image_url: null,
      is_global: false,
    });
    setEditingAbility(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Memoizar filtros para evitar recálculos desnecessários
  const filteredAbilities = useMemo(() => {
    return selectedCategory === 'all'
      ? abilities
      : abilities.filter(a => a.category === selectedCategory);
  }, [abilities, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return ABILITY_CATEGORIES.map(cat => ({
      ...cat,
      count: abilities.filter(a => a.category === cat.value).length,
    }));
  }, [abilities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold glow-text">Habilidades</h2>
          <p className="text-muted-foreground mt-1">Gerencie suas habilidades</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Habilidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAbility ? 'Editar Habilidade' : 'Nova Habilidade'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ABILITY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effect">Efeito</Label>
                <Input
                  id="effect"
                  value={form.effect}
                  onChange={(e) => setForm({ ...form, effect: e.target.value })}
                  placeholder="Ex: +2 em Percepção, Cura 1d6+2 PV"
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem</Label>
                <div className="flex items-center gap-4">
                  {form.image_url && (
                    <div className="relative">
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-24 h-24 rounded object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => setForm({ ...form, image_url: null })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Carregando...' : 'Carregar Imagem'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_global"
                  checked={form.is_global}
                  onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_global" className="cursor-pointer">
                  Tornar global (disponível para todos)
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          Todas ({abilities.length})
        </Button>
        {categoryCounts.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label} ({cat.count})
          </Button>
        ))}
      </div>

      {/* Abilities List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredAbilities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma habilidade encontrada.</p>
          <p className="text-sm mt-2">Crie uma nova habilidade para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAbilities.map((ability) => (
            <div
              key={ability.id}
              className="glass-card p-4 hover:shadow-glow transition-all"
            >
              <div className="flex items-start gap-3">
                {ability.image_url && (
                  <img
                    src={ability.image_url}
                    alt={ability.name}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{ability.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ABILITY_CATEGORIES.find(c => c.value === ability.category)?.label || ability.category}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(ability)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!ability.is_global && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(ability.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {ability.description}
                  </p>
                  {ability.effect && (
                    <p className="text-xs text-primary mt-2 font-medium">
                      {ability.effect}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

