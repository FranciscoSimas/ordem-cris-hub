import React, { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Edit, Trash2, Upload, X, Plus } from 'lucide-react';

// Categorias de armas
const WEAPON_CATEGORIES = [
  { value: 'antiga', label: 'Antiga' },
  { value: 'nova', label: 'Nova' },
  { value: 'arma_fogo', label: 'Arma de Fogo' },
  { value: 'cibernetica', label: 'Cibernética' },
  { value: 'medieval', label: 'Medieval' },
  { value: 'outra', label: 'Outra' },
] as const;

// Tipos de armas
const WEAPON_TYPES = [
  { value: 'corpo_a_corpo', label: 'Corpo a Corpo' },
  { value: 'distancia', label: 'Distância' },
  { value: 'arremesso', label: 'Arremesso' },
  { value: 'outra', label: 'Outra' },
] as const;

// Categorias de itens
const ITEM_CATEGORIES = [
  { value: 'consumivel', label: 'Consumível' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'utilidade', label: 'Utilidade' },
  { value: 'magico', label: 'Mágico' },
  { value: 'tecnologico', label: 'Tecnológico' },
  { value: 'outra', label: 'Outra' },
] as const;

interface Weapon {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  type: string;
  damage: string;
  modifier: string | null;
  range: string | null;
  weight: string | null;
  description: string | null;
  image_url: string | null;
  multiplier_crit: string | null;
  is_global: boolean;
  created_at: string;
}

interface Item {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  effect: string | null;
  weight: string | null;
  image_url: string | null;
  is_global: boolean;
  created_at: string;
}

export function InventorySection() {
  const [activeTab, setActiveTab] = useState<'weapons' | 'items'>('weapons');
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeaponDialog, setShowWeaponDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<Weapon | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  // Form states
  const [weaponForm, setWeaponForm] = useState({
    name: '',
    category: 'outra',
    type: 'outra',
    damage: '',
    modifier: '',
    range: '',
    weight: '',
    description: '',
    image_url: null as string | null,
    multiplier_crit: 'x2',
    is_global: false,
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'outra',
    description: '',
    effect: '',
    weight: '',
    image_url: null as string | null,
    is_global: false,
  });

  const weaponImageInputRef = useRef<HTMLInputElement>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const localWeapons = guestGet<Weapon[]>('weapons', []);
        const localItems = guestGet<Item[]>('items', []);
        setWeapons([...localWeapons].sort((a, b) => Number(b.is_global) - Number(a.is_global) || b.created_at.localeCompare(a.created_at)));
        setItems([...localItems].sort((a, b) => Number(b.is_global) - Number(a.is_global) || b.created_at.localeCompare(a.created_at)));
        return;
      }

      // Fetch weapons (global + user's own)
      const { data: weaponsData, error: weaponsError } = await supabase
        .from('weapons')
        .select('*')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('is_global', { ascending: false })
        .order('created_at', { ascending: false });

      // Fetch items (global + user's own)
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('is_global', { ascending: false })
        .order('created_at', { ascending: false });

      if (weaponsError) throw weaponsError;
      if (itemsError) throw itemsError;

      setWeapons(weaponsData || []);
      setItems(itemsData || []);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar inventário',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeaponImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const dataUrl = await fileToDataUrl(file);
        setWeaponForm({ ...weaponForm, image_url: dataUrl });
        toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `weapons/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(fileName);

      setWeaponForm({ ...weaponForm, image_url: publicUrl });
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleItemImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const dataUrl = await fileToDataUrl(file);
        setItemForm({ ...itemForm, image_url: dataUrl });
        toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `items/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(fileName);

      setItemForm({ ...itemForm, image_url: publicUrl });
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveWeapon = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const weaponData = {
        ...weaponForm,
        user_id: editingWeapon ? editingWeapon.user_id : (user?.id ?? GUEST_USER_ID),
        modifier: weaponForm.modifier || null,
        range: weaponForm.range || null,
        weight: weaponForm.weight || null,
        description: weaponForm.description || null,
        multiplier_crit: weaponForm.multiplier_crit || 'x2',
      };

      if (!user) {
        const list = guestGet<Weapon[]>('weapons', []);
        if (editingWeapon) {
          guestSet('weapons', list.map((w) => (w.id === editingWeapon.id ? { ...w, ...weaponData } : w)));
          toast({ title: 'Sucesso', description: 'Arma atualizada!' });
        } else {
          const created: Weapon = {
            id: guestId(),
            created_at: guestNow(),
            ...weaponData,
            is_global: weaponData.is_global ?? false,
          };
          guestSet('weapons', [created, ...list]);
          toast({ title: 'Sucesso', description: 'Arma adicionada!' });
        }
      } else if (editingWeapon) {
        const { error } = await supabase
          .from('weapons')
          .update(weaponData)
          .eq('id', editingWeapon.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Arma atualizada!' });
      } else {
        const { error } = await supabase.from('weapons').insert(weaponData);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Arma adicionada!' });
      }

      setShowWeaponDialog(false);
      setEditingWeapon(null);
      resetWeaponForm();
      fetchInventory();
    } catch (error: any) {
      console.error('Error saving weapon:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar arma',
        variant: 'destructive',
      });
    }
  };

  const handleSaveItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const itemData = {
        ...itemForm,
        user_id: editingItem ? editingItem.user_id : (user?.id ?? GUEST_USER_ID),
        description: itemForm.description || null,
        effect: itemForm.effect || null,
        weight: itemForm.weight || null,
      };

      if (!user) {
        const list = guestGet<Item[]>('items', []);
        if (editingItem) {
          guestSet('items', list.map((i) => (i.id === editingItem.id ? { ...i, ...itemData } : i)));
          toast({ title: 'Sucesso', description: 'Item atualizado!' });
        } else {
          const created: Item = {
            id: guestId(),
            created_at: guestNow(),
            ...itemData,
            is_global: itemData.is_global ?? false,
          };
          guestSet('items', [created, ...list]);
          toast({ title: 'Sucesso', description: 'Item adicionado!' });
        }
      } else if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Item atualizado!' });
      } else {
        const { error } = await supabase.from('items').insert(itemData);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Item adicionado!' });
      }

      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
      fetchInventory();
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar item',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWeapon = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta arma?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        guestSet('weapons', guestGet<Weapon[]>('weapons', []).filter((w) => w.id !== id));
      } else {
        const { error } = await supabase.from('weapons').delete().eq('id', id);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: 'Arma removida!' });
      fetchInventory();
    } catch (error: any) {
      console.error('Error deleting weapon:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover arma',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        guestSet('items', guestGet<Item[]>('items', []).filter((i) => i.id !== id));
      } else {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: 'Item removido!' });
      fetchInventory();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover item',
        variant: 'destructive',
      });
    }
  };

  const handleEditWeapon = (weapon: Weapon) => {
    setEditingWeapon(weapon);
    setWeaponForm({
      name: weapon.name,
      category: weapon.category,
      type: weapon.type,
      damage: weapon.damage,
      modifier: weapon.modifier || '',
      range: weapon.range || '',
      weight: weapon.weight || '',
      description: weapon.description || '',
      image_url: weapon.image_url,
      multiplier_crit: weapon.multiplier_crit || 'x2',
      is_global: weapon.is_global,
    });
    setShowWeaponDialog(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      effect: item.effect || '',
      weight: item.weight || '',
      image_url: item.image_url,
      is_global: item.is_global,
    });
    setShowItemDialog(true);
  };

  const resetWeaponForm = () => {
    setWeaponForm({
      name: '',
      category: 'outra',
      type: 'outra',
      damage: '',
      modifier: '',
      range: '',
      weight: '',
      description: '',
      image_url: null,
      multiplier_crit: 'x2',
      is_global: false,
    });
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      category: 'outra',
      description: '',
      effect: '',
      weight: '',
      image_url: null,
      is_global: false,
    });
  };

  const openWeaponDialog = () => {
    resetWeaponForm();
    setEditingWeapon(null);
    setShowWeaponDialog(true);
  };

  const openItemDialog = () => {
    resetItemForm();
    setEditingItem(null);
    setShowItemDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold glow-text mb-2">Inventário</h2>
        <p className="text-muted-foreground">Gerencie armas e itens do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weapons' | 'items')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="weapons">⚔️ Armas ({weapons.length})</TabsTrigger>
          <TabsTrigger value="items">🎒 Itens ({items.length})</TabsTrigger>
        </TabsList>

        {/* Weapons Tab */}
        <TabsContent value="weapons" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openWeaponDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Arma
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : weapons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Nenhuma arma registrada</p>
              <p className="text-sm">Clique em "Nova Arma" para adicionar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weapons.map((weapon) => (
                <div key={weapon.id} className="glass-card p-4 space-y-3">
                  {weapon.image_url && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary/50">
                      <img
                        src={weapon.image_url}
                        alt={weapon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-lg">{weapon.name}</h4>
                      {weapon.is_global && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Global</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {WEAPON_CATEGORIES.find(c => c.value === weapon.category)?.label || weapon.category} • {WEAPON_TYPES.find(t => t.value === weapon.type)?.label || weapon.type}
                    </p>
                    <p className="text-sm font-semibold mt-1">{weapon.damage}</p>
                    {weapon.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{weapon.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWeapon(weapon)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteWeapon(weapon.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openItemDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Nenhum item registrado</p>
              <p className="text-sm">Clique em "Novo Item" para adicionar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="glass-card p-4 space-y-3">
                  {item.image_url && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary/50">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      {item.is_global && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Global</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ITEM_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </p>
                    {item.effect && (
                      <p className="text-sm font-semibold mt-1 text-primary">{item.effect}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Weapon Dialog */}
      <Dialog open={showWeaponDialog} onOpenChange={setShowWeaponDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWeapon ? 'Editar Arma' : 'Nova Arma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={weaponForm.name}
                  onChange={(e) => setWeaponForm({ ...weaponForm, name: e.target.value })}
                  placeholder="Ex: Espada Longa"
                  required
                />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={weaponForm.category}
                  onValueChange={(value) => setWeaponForm({ ...weaponForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAPON_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={weaponForm.type}
                  onValueChange={(value) => setWeaponForm({ ...weaponForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAPON_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dano *</Label>
                <Input
                  value={weaponForm.damage}
                  onChange={(e) => setWeaponForm({ ...weaponForm, damage: e.target.value })}
                  placeholder="Ex: 2d6+2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Modificador</Label>
                <Input
                  value={weaponForm.modifier}
                  onChange={(e) => setWeaponForm({ ...weaponForm, modifier: e.target.value })}
                  placeholder="Ex: +FOR"
                />
              </div>
              <div>
                <Label>Alcance</Label>
                <Input
                  value={weaponForm.range}
                  onChange={(e) => setWeaponForm({ ...weaponForm, range: e.target.value })}
                  placeholder="Ex: Corpo a Corpo, 15m"
                />
              </div>
            </div>

            <div>
              <Label>Multiplicador Crítico</Label>
              <Select
                value={weaponForm.multiplier_crit}
                onValueChange={(value) => setWeaponForm({ ...weaponForm, multiplier_crit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x2">x2</SelectItem>
                  <SelectItem value="x3">x3</SelectItem>
                  <SelectItem value="x4">x4</SelectItem>
                  <SelectItem value="x5">x5</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Multiplica os dados primeiro, depois adiciona o modificador
              </p>
            </div>

            <div>
              <Label>Peso</Label>
              <Input
                value={weaponForm.weight}
                onChange={(e) => setWeaponForm({ ...weaponForm, weight: e.target.value })}
                placeholder="Ex: 1kg"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={weaponForm.description}
                onChange={(e) => setWeaponForm({ ...weaponForm, description: e.target.value })}
                placeholder="Descrição da arma..."
                rows={3}
              />
            </div>

            <div>
              <Label>Imagem</Label>
              <div className="space-y-2">
                {weaponForm.image_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary/50">
                    <img
                      src={weaponForm.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setWeaponForm({ ...weaponForm, image_url: null })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <input
                  ref={weaponImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleWeaponImageUpload(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => weaponImageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Enviando...' : weaponForm.image_url ? 'Trocar Imagem' : 'Adicionar Imagem'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="weapon-global"
                checked={weaponForm.is_global}
                onChange={(e) => setWeaponForm({ ...weaponForm, is_global: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="weapon-global" className="cursor-pointer">
                Tornar disponível para todos os usuários (Global)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeaponDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveWeapon} disabled={!weaponForm.name || !weaponForm.damage}>
              {editingWeapon ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Ex: Kit Médico"
                  required
                />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(value) => setItemForm({ ...itemForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Efeito</Label>
              <Input
                value={itemForm.effect}
                onChange={(e) => setItemForm({ ...itemForm, effect: e.target.value })}
                placeholder="Ex: +2 em Percepção"
              />
            </div>

            <div>
              <Label>Peso</Label>
              <Input
                value={itemForm.weight}
                onChange={(e) => setItemForm({ ...itemForm, weight: e.target.value })}
                placeholder="Ex: 0.5kg"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Descrição do item..."
                rows={3}
              />
            </div>

            <div>
              <Label>Imagem</Label>
              <div className="space-y-2">
                {itemForm.image_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary/50">
                    <img
                      src={itemForm.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setItemForm({ ...itemForm, image_url: null })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <input
                  ref={itemImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleItemImageUpload(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => itemImageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Enviando...' : itemForm.image_url ? 'Trocar Imagem' : 'Adicionar Imagem'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="item-global"
                checked={itemForm.is_global}
                onChange={(e) => setItemForm({ ...itemForm, is_global: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="item-global" className="cursor-pointer">
                Tornar disponível para todos os usuários (Global)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={!itemForm.name}>
              {editingItem ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
