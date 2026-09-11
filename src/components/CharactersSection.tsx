import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDiscord } from '@/contexts/DiscordContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { guestGet, guestSet, guestId, guestNow, GUEST_USER_ID, fileToDataUrl } from '@/lib/guestStorage';

interface Character {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  attribute_int: number;
  attribute_agi: number;
  attribute_for: number;
  attribute_pre: number;
  attribute_vig: number;
  skills: Array<{ name: string; base: number; bonus: number; total: number }>;
  allowed_users: string[] | null;
  created_at: string;
}

// Perícias oficiais de Ordem Paranormal com seus atributos
// Nomes padronizados (usar sempre estes nomes exatos)
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

// Mapeamento para normalizar nomes antigos/variantes para os nomes corretos
const skillNameNormalization: Record<string, string> = {
  'Acrobacia': 'Acrobacias',
  'Sobrevivencia': 'Sobrevivência',
  'Sobrevivência': 'Sobrevivência', // Garantir consistência
};

// Função para normalizar nome de perícia
const normalizeSkillName = (skillName: string): string => {
  // Verificar se há mapeamento direto
  if (skillNameNormalization[skillName]) {
    return skillNameNormalization[skillName];
  }
  // Se já está correto, retornar como está
  if (skillToAttribute[skillName]) {
    return skillName;
  }
  // Tentar encontrar por similaridade (case-insensitive)
  const normalized = Object.keys(skillToAttribute).find(
    key => key.toLowerCase() === skillName.toLowerCase()
  );
  return normalized || skillName;
};

const officialSkills = Object.keys(skillToAttribute).sort();

interface SkillSelection {
  name: string;
  base: number; // 0, 5, 10, 15, 20
  bonus: number; // bônus adicional
}

export function CharactersSection() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSkillsDialog, setShowSkillsDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [crisUrl, setCrisUrl] = useState('');
  const [previewData, setPreviewData] = useState<{
    name: string;
    attributes: { FOR: number; AGI: number; INT: number; VIG: number; PRE: number };
    skills: Array<{ name: string; base: number; bonus: number; total: number }>;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    attribute_int: 1,
    attribute_agi: 1,
    attribute_for: 1,
    attribute_pre: 1,
    attribute_vig: 1,
    skills: [] as Array<{ name: string; base: number; bonus: number; total: number }>,
    allowed_users: [] as string[],
  });

  // Skills selection state (for the modal)
  const [skillsSelection, setSkillsSelection] = useState<Record<string, SkillSelection>>({});

  // Users list for permissions
  const [usersList, setUsersList] = useState<Array<{ id: string; email: string; display_name: string | null }>>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]); // IDs of all admin users

  useEffect(() => {
    fetchCharacters();
    fetchUsersList();
    
  }, []);

  const fetchUsersList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUser(null);
        return;
      }

      // Get current user role
      // Use the has_role function to avoid RLS recursion issues
      // But first try direct query, if it fails, use a workaround
      let userRole = 'player';
      
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleError) {
          // If RLS error, try using rpc or direct query bypass
          console.warn('Error fetching user role (may be RLS issue):', roleError);
          // Fallback: assume player role if we can't fetch
          userRole = 'player';
        } else {
          userRole = roleData?.role || 'player';
        }
      } catch (err) {
        console.error('Exception fetching user role:', err);
        userRole = 'player';
      }
      
      setCurrentUser({ id: user.id, role: userRole });
      
      // Fetch admin user IDs (to filter them out for non-admin users)
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminIds = adminRoles?.map(r => r.user_id) || [];
      setAdminUserIds(adminIds);
      console.log('Admin user IDs:', adminIds);
      
      // Fetch all users for permissions
      // Admin should see all profiles, others only see their own
      // But for permissions, we need all users, so we'll try to get all
      console.log('Fetching users list, current role:', userRole);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name');
      
      console.log('Profiles query result:', { profiles, profilesError, count: profiles?.length });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: 'Aviso',
          description: 'Não foi possível carregar lista de usuários. Verifique as políticas RLS.',
          variant: 'destructive',
        });
      }
      
      if (profiles && profiles.length > 0) {
        const mappedUsers = profiles.map(p => ({
          id: p.id,
          display_name: p.display_name || `Usuário ${p.id.substring(0, 8)}`,
          email: '', // Email not needed for display
        }));
        console.log('✅ Loaded users for permissions:', mappedUsers.length, mappedUsers);
        setUsersList(mappedUsers);
      } else {
        console.warn('⚠️ No profiles found - usersList will be empty');
        setUsersList([]);
      }
    } catch (error) {
      console.error('Error fetching users list:', error);
    }
  };

  const fetchCharacters = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const local = guestGet<Character[]>('characters', []);
        const processedData = local.map((char) => ({
          ...char,
          allowed_users: char.allowed_users || [],
          skills: (char.skills || []).map((skill) => ({
            ...skill,
            name: normalizeSkillName(skill.name),
            total: (skill.base || 0) + (skill.bonus || 0),
          })).filter((skill) => skillToAttribute[skill.name] !== undefined),
        }));
        setCharacters(processedData);
        setIsLoading(false);
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isAdmin = roleData?.role === 'admin';

      // Fetch characters - RLS will filter based on permissions
      // Admin sees all, others see their own + shared with them
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process skills to ensure they have total calculated and normalized names
      const processedData = (data || []).map((char: any) => ({
        ...char,
        allowed_users: char.allowed_users || [],
        skills: (char.skills || []).map((skill: { name: string; base?: number; bonus?: number; total?: number }) => ({
          ...skill,
          name: normalizeSkillName(skill.name), // Normalize skill name
          total: (skill.base || 0) + (skill.bonus || 0)
        })).filter((skill: { name: string; total: number }) => {
          // Only keep skills that exist in official list
          return skillToAttribute[skill.name] !== undefined;
        })
      }));

      setCharacters(processedData);
    } catch (error: any) {
      console.error('Error fetching characters:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar personagens',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL and open crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageToCrop(result);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const dataUrl = await fileToDataUrl(croppedBlob);
        setFormData({ ...formData, image_url: dataUrl });
        setImagePreview(dataUrl);
        toast({ title: 'Sucesso', description: 'Imagem recortada (modo local)' });
        return;
      }

      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload cropped image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast({
        title: 'Sucesso',
        description: 'Imagem recortada e enviada com sucesso',
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const list = guestGet<Character[]>('characters', []);
        const characterData: Character = {
          id: editingCharacter?.id ?? guestId(),
          user_id: GUEST_USER_ID,
          name: formData.name.trim(),
          description: formData.description || null,
          image_url: formData.image_url || null,
          attribute_int: formData.attribute_int,
          attribute_agi: formData.attribute_agi,
          attribute_for: formData.attribute_for,
          attribute_pre: formData.attribute_pre,
          attribute_vig: formData.attribute_vig,
          skills: formData.skills,
          allowed_users: formData.allowed_users.length > 0 ? formData.allowed_users : null,
          created_at: editingCharacter?.created_at ?? guestNow(),
        };
        const next = editingCharacter
          ? list.map((c) => (c.id === editingCharacter.id ? characterData : c))
          : [characterData, ...list];
        guestSet('characters', next);
        toast({
          title: 'Sucesso',
          description: editingCharacter ? 'Personagem atualizado com sucesso' : 'Personagem criado com sucesso',
        });
        setShowAddDialog(false);
        setEditingCharacter(null);
        resetForm();
        fetchCharacters();
        return;
      }

      const characterData = {
        name: formData.name.trim(),
        description: formData.description || null,
        image_url: formData.image_url || null,
        attribute_int: formData.attribute_int,
        attribute_agi: formData.attribute_agi,
        attribute_for: formData.attribute_for,
        attribute_pre: formData.attribute_pre,
        attribute_vig: formData.attribute_vig,
        skills: formData.skills,
        allowed_users: formData.allowed_users.length > 0 ? formData.allowed_users : null,
        user_id: user.id,
      };

      if (editingCharacter) {
        const { error } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', editingCharacter.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Personagem atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('characters')
          .insert(characterData);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Personagem criado com sucesso',
        });
      }

      setShowAddDialog(false);
      setEditingCharacter(null);
      resetForm();
      fetchCharacters();
    } catch (error: any) {
      console.error('Error saving character:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar personagem',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este personagem?')) return;

    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Personagem deletado com sucesso',
      });
      fetchCharacters();
    } catch (error: any) {
      console.error('Error deleting character:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao deletar personagem',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (character: Character) => {
    setEditingCharacter(character);
    
    // Reload user role to ensure it's up to date
    await fetchUsersList();
    
    // Normalize skill names when editing
    const normalizedSkills = (character.skills || []).map(skill => ({
      ...skill,
      name: normalizeSkillName(skill.name)
    })).filter(skill => skillToAttribute[skill.name] !== undefined);
    
    setFormData({
      name: character.name,
      description: character.description || '',
      image_url: character.image_url || '',
      attribute_int: character.attribute_int,
      attribute_agi: character.attribute_agi,
      attribute_for: character.attribute_for,
      attribute_pre: character.attribute_pre,
      attribute_vig: character.attribute_vig,
      skills: normalizedSkills,
      allowed_users: character.allowed_users || [],
    });
    
    // Initialize skills selection for editing with normalized names
    const selection: Record<string, SkillSelection> = {};
    normalizedSkills.forEach(skill => {
      selection[skill.name] = {
        name: skill.name,
        base: skill.base || 0,
        bonus: skill.bonus || 0,
      };
    });
    setSkillsSelection(selection);
    setImagePreview(character.image_url || '');
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      attribute_int: 1,
      attribute_agi: 1,
      attribute_for: 1,
      attribute_pre: 1,
      attribute_vig: 1,
      skills: [],
      allowed_users: [],
    });
    setSkillsSelection({});
    setImagePreview('');
  };

  const handleImportFromCrisData = async (data: any) => {
    try {
      // O formato retornado pela API é: { name, attributes: { FOR, AGI, INT, VIG, PRE }, skills: [...] }
      // Suportar também formatos antigos para compatibilidade
      const characterData = data.agent || data.character || data.data || data;
      
      if (!characterData || !characterData.name) {
        throw new Error('Dados inválidos: nome do personagem não encontrado');
      }

      // Extrair atributos - formato da API: { FOR: 2, AGI: 3, INT: 4, VIG: 2, PRE: 3 }
      let attrs: any = {};
      if (characterData.attributes && typeof characterData.attributes === 'object' && !Array.isArray(characterData.attributes)) {
        // Formato novo da API: { attributes: { FOR: 2, AGI: 3, ... } }
        attrs = characterData.attributes;
      } else {
        // Formato antigo: { attr: { int: 3, ... } }
        attrs = characterData.attributes || characterData.attr || {};
      }

      // Normalizar atributos (garantir valores válidos entre 1 e 5)
      const attribute_int = Math.max(1, Math.min(5, parseInt(attrs.INT || attrs.int || attrs.attribute_int || '1') || 1));
      const attribute_agi = Math.max(1, Math.min(5, parseInt(attrs.AGI || attrs.agi || attrs.attribute_agi || '1') || 1));
      const attribute_for = Math.max(1, Math.min(5, parseInt(attrs.FOR || attrs.for || attrs.attribute_for || '1') || 1));
      const attribute_pre = Math.max(1, Math.min(5, parseInt(attrs.PRE || attrs.pre || attrs.attribute_pre || '1') || 1));
      const attribute_vig = Math.max(1, Math.min(5, parseInt(attrs.VIG || attrs.vig || attrs.attribute_vig || '1') || 1));

      // Extrair perícias - formato da API: [{ name, base, bonus, total }, ...]
      const skills = characterData.skills || characterData.pericias || [];

      // Normalizar perícias - garantir que nomes estão corretos e filtrar apenas perícias válidas
      const normalizedSkills = skills
        .map((s: any) => {
          // Se já tem base e bonus separados (formato da API), usar diretamente
          if (s.base !== undefined && s.bonus !== undefined) {
            const normalizedName = normalizeSkillName(s.name || s.nome || '');
            // Só incluir se for uma perícia oficial
            if (!skillToAttribute[normalizedName]) {
              console.warn(`Perícia ignorada (não oficial): ${s.name}`);
              return null;
            }
            return {
              name: normalizedName,
              base: Math.max(0, s.base || 0),
              bonus: Math.max(0, s.bonus || 0),
              total: s.total || (s.base + s.bonus),
            };
          }
          // Formato antigo: calcular base e bonus do total
          const total = parseInt(s.total || s.value || s.valor || s.base || '0');
          const base = Math.floor(total / 5) * 5;
          const bonus = total - base;
          const normalizedName = normalizeSkillName(s.name || s.nome || '');
          // Só incluir se for uma perícia oficial
          if (!skillToAttribute[normalizedName]) {
            console.warn(`Perícia ignorada (não oficial): ${s.name}`);
            return null;
          }
          return {
            name: normalizedName,
            base,
            bonus,
            total,
          };
        })
        .filter((s: any) => s !== null && skillToAttribute[s.name] !== undefined && s.total > 0);

      // Verificar se há dados mínimos válidos
      if (!characterData.name || characterData.name.trim() === '') {
        throw new Error('Nome do personagem é obrigatório');
      }

      // Criar personagem no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para importar personagens',
          variant: 'destructive',
        });
        return;
      }

      const newCharacterData = {
        name: characterData.name.trim(),
        description: characterData.description || characterData.desc || null,
        image_url: characterData.image || characterData.avatar || characterData.image_url || null,
        attribute_int,
        attribute_agi,
        attribute_for,
        attribute_pre,
        attribute_vig,
        skills: normalizedSkills,
        allowed_users: null,
        user_id: user.id,
      };

      console.log('Importing character:', {
        name: newCharacterData.name,
        attributes: {
          INT: newCharacterData.attribute_int,
          AGI: newCharacterData.attribute_agi,
          FOR: newCharacterData.attribute_for,
          PRE: newCharacterData.attribute_pre,
          VIG: newCharacterData.attribute_vig,
        },
        skillsCount: normalizedSkills.length,
      });

      const { error } = await supabase
        .from('characters')
        .insert(newCharacterData);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Erro ao salvar personagem: ${error.message}`);
      }

      toast({
        title: 'Sucesso!',
        description: `Personagem "${newCharacterData.name}" importado com sucesso!`,
      });

      // Limpar formulário e fechar diálogo
      setShowImportDialog(false);
      setCrisUrl('');
      setPreviewData(null);
      
      // Atualizar lista de personagens
      await fetchCharacters();
    } catch (error: any) {
      console.error('Error importing C.R.I.S. character:', error);
      toast({
        title: 'Erro ao importar',
        description: error.message || 'Não foi possível importar o personagem. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleFetchCrisData = async () => {
    // Validar URL antes de fazer requisição
    const url = crisUrl.trim();
    
    if (!url) {
      toast({
        title: 'URL necessária',
        description: 'Por favor, cole a URL do personagem no C.R.I.S.',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato da URL
    if (!url.includes('crisordemparanormal.com') && !url.includes('cris.com')) {
      toast({
        title: 'URL inválida',
        description: 'A URL deve ser do site crisordemparanormal.com',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingPreview(true);
    setPreviewData(null);

    try {
      console.log('Fetching CRIS data from URL:', url);
      
      const response = await fetch('/api/cris/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        let errorMessage = 'Erro ao buscar dados do C.R.I.S.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('API Error:', errorData);
        } catch (e) {
          // Se não conseguir parsear o JSON, usar mensagem padrão
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('CRIS data received:', {
        name: data.name,
        hasAttributes: !!data.attributes,
        skillsCount: data.skills?.length || 0,
      });
      
      // Validar dados retornados
      if (!data.name || !data.attributes || !Array.isArray(data.skills)) {
        throw new Error('Dados incompletos retornados do C.R.I.S. Verifique se a URL está correta.');
      }

      // Validar atributos
      const requiredAttrs = ['FOR', 'AGI', 'INT', 'VIG', 'PRE'];
      const missingAttrs = requiredAttrs.filter(attr => !data.attributes[attr]);
      if (missingAttrs.length > 0) {
        throw new Error(`Atributos faltando: ${missingAttrs.join(', ')}`);
      }

      setPreviewData(data);
      toast({
        title: 'Dados carregados!',
        description: `Personagem "${data.name}" encontrado. Verifique os dados e clique em Importar.`,
      });
    } catch (error: any) {
      console.error('Error fetching C.R.I.S. data:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = error.message || 'Não foi possível buscar os dados do C.R.I.S.';
      
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = 'A página demorou muito para carregar. Tente novamente.';
      } else if (error.message?.includes('net::ERR') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message?.includes('Invalid C.R.I.S. URL')) {
        errorMessage = 'URL inválida. Certifique-se de que é uma URL do C.R.I.S.';
      }
      
      toast({
        title: 'Erro ao buscar dados',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleImportFromCris = async () => {
    if (!previewData) {
      toast({
        title: 'Erro',
        description: 'Por favor, busque os dados do personagem primeiro',
        variant: 'destructive',
      });
      return;
    }

    await handleImportFromCrisData(previewData);
  };

  const openSkillsDialog = () => {
    // Initialize skills selection with current skills
    const selection: Record<string, SkillSelection> = {};
    formData.skills.forEach(skill => {
      selection[skill.name] = {
        name: skill.name,
        base: skill.base || 0,
        bonus: skill.bonus || 0,
      };
    });
    setSkillsSelection(selection);
    setShowSkillsDialog(true);
  };

  const confirmSkills = () => {
    // Filter skills that have at least one value > 0
    const selectedSkills = (Object.values(skillsSelection) as SkillSelection[])
      .filter(skill => skill.base > 0 || skill.bonus !== 0)
      .map(skill => ({
        name: skill.name,
        base: skill.base,
        bonus: skill.bonus,
        total: skill.base + skill.bonus,
      }));

    setFormData({ ...formData, skills: selectedSkills });
    setShowSkillsDialog(false);
  };

  const updateSkillSelection = (skillName: string, field: 'base' | 'bonus', value: number) => {
    setSkillsSelection(prev => ({
      ...prev,
      [skillName]: {
        name: skillName,
        base: field === 'base' ? value : (prev[skillName]?.base || 0),
        bonus: field === 'bonus' ? value : (prev[skillName]?.bonus || 0),
      },
    }));
  };

  const AttributeInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
    <div className="flex items-center gap-2">
      <Label className="w-12 text-sm">{label}</Label>
      <Input
        type="number"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
        className="w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={cn(
              'w-6 h-6 rounded text-xs font-bold transition-colors',
              value >= num
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando personagens...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold glow-text">Personagens</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus NPCs e personagens</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={async (open) => {
            setShowAddDialog(open);
            if (open && editingCharacter) {
              // Reload user role when opening edit dialog
              await fetchUsersList();
            }
            if (!open) {
              setEditingCharacter(null);
              resetForm();
            }
          }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setEditingCharacter(null);
            }}>
              + Novo Personagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCharacter ? 'Editar Personagem' : 'Novo Personagem'}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="settings" disabled={!editingCharacter}>
                  Configurações
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4 mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Imagem do Personagem</Label>
                    <div
                      className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                        'hover:border-primary/50',
                        uploadingImage && 'opacity-50 pointer-events-none'
                      )}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {imagePreview || formData.image_url ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview || formData.image_url}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg mx-auto"
                          />
                          <p className="text-sm text-muted-foreground">Clique ou arraste para trocar a imagem</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-4xl">📷</div>
                          <p className="text-sm text-muted-foreground">
                            {uploadingImage ? 'Enviando...' : 'Arraste uma imagem aqui ou clique para selecionar'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Atributos (1-5)</Label>
                    <div className="space-y-2 p-4 bg-secondary/30 rounded-lg">
                      <AttributeInput
                        label="INT"
                        value={formData.attribute_int}
                        onChange={(value) => setFormData({ ...formData, attribute_int: value })}
                      />
                      <AttributeInput
                        label="AGI"
                        value={formData.attribute_agi}
                        onChange={(value) => setFormData({ ...formData, attribute_agi: value })}
                      />
                      <AttributeInput
                        label="FOR"
                        value={formData.attribute_for}
                        onChange={(value) => setFormData({ ...formData, attribute_for: value })}
                      />
                      <AttributeInput
                        label="PRE"
                        value={formData.attribute_pre}
                        onChange={(value) => setFormData({ ...formData, attribute_pre: value })}
                      />
                      <AttributeInput
                        label="VIG"
                        value={formData.attribute_vig}
                        onChange={(value) => setFormData({ ...formData, attribute_vig: value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Perícias Principais</Label>
                      <Button type="button" onClick={openSkillsDialog} variant="outline" size="sm">
                        + Adicionar
                      </Button>
                    </div>
                    {formData.skills.length > 0 ? (
                      <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                        {formData.skills.map((skill, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{skill.name}</span>
                            <span className="font-bold text-primary">{skill.total}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma perícia selecionada</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setShowAddDialog(false);
                      setEditingCharacter(null);
                      resetForm();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingCharacter ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                {editingCharacter && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold">Permissões</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecione quais usuários podem ver e usar este personagem
                      </p>
                      
                      {(() => {
                        // Check if user is admin or owner of the character
                        const isAdmin = currentUser?.role === 'admin';
                        const isOwner = currentUser?.id === editingCharacter.user_id;
                        const canManage = isAdmin || isOwner;
                        
                        // Debug log
                        console.log('Permission check:', {
                          currentUser,
                          characterOwner: editingCharacter.user_id,
                          isAdmin,
                          isOwner,
                          canManage,
                          usersListLength: usersList.length,
                        });
                        
                        return canManage;
                      })() ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto p-3 bg-secondary/30 rounded-lg">
                          {usersList.length > 0 ? (
                            <>
                              {usersList
                                .filter(user => {
                                  // Always exclude the owner
                                  if (user.id === editingCharacter.user_id) return false;
                                  
                                  // If current user is NOT admin, also exclude all admins
                                  // (because admin can see all characters anyway)
                                  if (currentUser?.role !== 'admin' && adminUserIds.includes(user.id)) {
                                    return false;
                                  }
                                  
                                  return true;
                                })
                                .map((user) => (
                                  <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded">
                                    <input
                                      type="checkbox"
                                      id={`user-${user.id}`}
                                      checked={formData.allowed_users.includes(user.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setFormData({
                                            ...formData,
                                            allowed_users: [...formData.allowed_users, user.id],
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            allowed_users: formData.allowed_users.filter(id => id !== user.id),
                                          });
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-primary"
                                    />
                                    <label
                                      htmlFor={`user-${user.id}`}
                                      className="flex-1 cursor-pointer text-sm"
                                    >
                                      {user.display_name || user.email || user.id}
                                    </label>
                                  </div>
                                ))}
                              {usersList.filter(user => {
                                if (user.id === editingCharacter.user_id) return false;
                                if (currentUser?.role !== 'admin' && adminUserIds.includes(user.id)) return false;
                                return true;
                              }).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhum outro usuário disponível
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Carregando usuários...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground p-4 bg-secondary/30 rounded-lg">
                          Apenas administradores podem gerenciar permissões de personagens.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => {
                        setShowAddDialog(false);
                        setEditingCharacter(null);
                        resetForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }}>
                        Salvar Permissões
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
          
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            📥 Importar do C.R.I.S.
          </Button>
        </div>
      </div>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        imageSrc={imageToCrop}
        aspectRatio={9 / 16}
        onCropComplete={handleCropComplete}
        cardWidth={220}
        cardHeight={390}
      />

      {/* Import C.R.I.S. Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setCrisUrl('');
          setPreviewData(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Personagem do C.R.I.S.</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cris-url">URL do Personagem no C.R.I.S.</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="cris-url"
                  placeholder="https://crisordemparanormal.com/agente/..."
                  value={crisUrl}
                  onChange={(e) => setCrisUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoadingPreview) {
                      handleFetchCrisData();
                    }
                  }}
                  disabled={isLoadingPreview}
                />
                <Button 
                  onClick={handleFetchCrisData} 
                  disabled={!crisUrl.trim() || isLoadingPreview}
                >
                  {isLoadingPreview ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cole a URL completa da página do personagem no C.R.I.S.
              </p>
            </div>

            {previewData && (
              <div className="bg-muted p-4 rounded-lg space-y-4 border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Preview do Personagem</h3>
                  <span className="text-sm text-muted-foreground">✓ Dados carregados</span>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Nome:</Label>
                  <p className="text-base font-semibold">{previewData.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Atributos:</Label>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="bg-background p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">FOR</div>
                      <div className="text-lg font-bold">{previewData.attributes.FOR}</div>
                    </div>
                    <div className="bg-background p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">AGI</div>
                      <div className="text-lg font-bold">{previewData.attributes.AGI}</div>
                    </div>
                    <div className="bg-background p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">INT</div>
                      <div className="text-lg font-bold">{previewData.attributes.INT}</div>
                    </div>
                    <div className="bg-background p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">VIG</div>
                      <div className="text-lg font-bold">{previewData.attributes.VIG}</div>
                    </div>
                    <div className="bg-background p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">PRE</div>
                      <div className="text-lg font-bold">{previewData.attributes.PRE}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Perícias ({previewData.skills.length} encontradas):
                  </Label>
                  <div className="bg-background p-3 rounded max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {previewData.skills.map((skill, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-muted-foreground">
                            {skill.base > 0 ? `${skill.base}+${skill.bonus}` : skill.bonus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setCrisUrl('');
              setPreviewData(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportFromCris} 
              disabled={!previewData}
            >
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Skills Selection Dialog */}
      <Dialog open={showSkillsDialog} onOpenChange={setShowSkillsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Perícias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {officialSkills.map((skillName) => {
                const skill = skillsSelection[skillName] || { name: skillName, base: 0, bonus: 0 };
                return (
                  <div key={skillName} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex-1 font-medium">{skillName}</div>
                    <Select
                      value={skill.base.toString()}
                      onValueChange={(value) => updateSkillSelection(skillName, 'base', parseInt(value))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={skill.bonus}
                      onChange={(e) => updateSkillSelection(skillName, 'bonus', parseInt(e.target.value) || 0)}
                      className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Bônus"
                    />
                    <div className="w-16 text-right font-bold text-primary">
                      {skill.base + skill.bonus}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowSkillsDialog(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmSkills}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Characters Grid */}
      {characters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum personagem criado ainda.</p>
          <p className="text-sm mt-2">Clique em "Novo Personagem" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={() => handleEdit(character)}
              onDelete={() => handleDelete(character.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// CharacterCard component
function CharacterCard({ character, onEdit, onDelete }: { character: Character; onEdit: () => void | Promise<void>; onDelete: () => void }) {
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
  const [characterAbilities, setCharacterAbilities] = useState<Array<{
    id: string;
    ability: {
      id: string;
      name: string;
      category: string;
      description: string;
      effect: string | null;
      image_url: string | null;
    };
    notes: string | null;
  }>>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [showWeaponEquipDialog, setShowWeaponEquipDialog] = useState(false);
  const [showItemEquipDialog, setShowItemEquipDialog] = useState(false);
  const [showAbilityEquipDialog, setShowAbilityEquipDialog] = useState(false);
  const [availableWeapons, setAvailableWeapons] = useState<Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    damage: string;
    modifier: string | null;
    range: string | null;
    image_url: string | null;
    multiplier_crit: string | null;
  }>>([]);
  const [availableItems, setAvailableItems] = useState<Array<{
    id: string;
    name: string;
    category: string;
    effect: string | null;
    image_url: string | null;
  }>>([]);
  const [availableAbilities, setAvailableAbilities] = useState<Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    effect: string | null;
    image_url: string | null;
  }>>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [pressingWeaponId, setPressingWeaponId] = useState<string | null>(null);
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);
  const [critProgress, setCritProgress] = useState(0);
  const pressTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

      // Fetch abilities
      const { data: abilitiesData } = await supabase
        .from('character_abilities')
        .select(`
          id,
          notes,
          ability:abilities(id, name, category, description, effect, image_url)
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

      setCharacterAbilities(abilitiesData?.map((ca: any) => ({
        id: ca.id,
        ability: ca.ability,
        notes: ca.notes,
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

      // Fetch all available weapons (global + user's own)
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

      // Fetch all available items (global + user's own)
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

  const fetchAvailableAbilities = async () => {
    setIsLoadingAvailable(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all available abilities (global + user's own)
      const { data, error } = await supabase
        .from('abilities')
        .select('id, name, category, description, effect, image_url')
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order('name');

      if (error) throw error;
      setAvailableAbilities(data || []);
    } catch (error: any) {
      console.error('Error fetching available abilities:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar habilidades disponíveis',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleEquipAbility = async (abilityId: string) => {
    try {
      // Check if ability is already equipped
      const existing = characterAbilities.find(ca => ca.ability.id === abilityId);
      
      if (existing) {
        toast({
          title: 'Aviso',
          description: 'Habilidade já está equipada',
        });
        return;
      }

      // Add new ability
      const { error } = await supabase
        .from('character_abilities')
        .insert({
          character_id: character.id,
          ability_id: abilityId,
        });

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Habilidade equipada',
      });

      setShowAbilityEquipDialog(false);
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error equipping ability:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao equipar habilidade',
        variant: 'destructive',
      });
    }
  };

  const handleUnequipAbility = async (characterAbilityId: string) => {
    try {
      const { error } = await supabase
        .from('character_abilities')
        .delete()
        .eq('id', characterAbilityId);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Habilidade removida',
      });
      fetchCharacterEquipment();
    } catch (error: any) {
      console.error('Error removing ability:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover habilidade',
        variant: 'destructive',
      });
    }
  };

  const handleEquipWeapon = async (weaponId: string) => {
    try {
      // Check if weapon is already equipped
      const existing = characterWeapons.find(cw => cw.weapon.id === weaponId);
      
      if (existing) {
        // Toggle equipped status
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
        // Add new weapon
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
      // Check if item is already in inventory
      const existing = characterItems.find(ci => ci.item.id === itemId);
      
      if (existing) {
        // Update quantity or toggle equipped
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
        // Add new item
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
      
      // Add to history
      addRollToHistory({
        characterName: character.name,
        skillName: weapon.name,
        attribute: 'Dano',
        rolls,
        total,
        formula,
        sentToDiscord,
        campaignId: null,
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
        campaignId: null, // General roll
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
              campaignId: null,
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
    // Don't flip if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="tab"]') || target.closest('[role="tablist"]') || target.closest('img[src="/Dice.png"]')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  // Handle Discord dice roll
  const handleDiscordRoll = async (skill: { name: string; attribute: string; attrValue: number; bonus: number; displayValue: string }) => {
    if (isRolling) return;
    
    setIsRolling(true);
    
    try {
      // Parse roll formula to get dice count and sides
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
        // Use crypto.getRandomValues for true randomness
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        // Convert to range [1, sides]
        rolls.push((array[0] % sides) + 1);
      }
      
      // For skills, take the highest roll
      const total = Math.max(...rolls) + modifier;
      
      // Add to history (general roll, no campaignId)
      const sentToDiscord = isDiscordEnabled;
      
      addRollToHistory({
        characterName: character.name,
        skillName: skill.name,
        attribute: skill.attribute,
        rolls,
        total,
        formula: skill.displayValue,
        sentToDiscord: false,
        campaignId: null, // General roll, not from campaign
        isAttributeRoll: false,
      });
      
      // If Discord is enabled, send to Discord
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
            // Update history entry to mark as sent
            addRollToHistory({
              characterName: character.name,
              skillName: skill.name,
              attribute: skill.attribute,
              rolls,
              total,
              formula: skill.displayValue,
              sentToDiscord: true,
              campaignId: null,
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

  return (
    <div 
      className={cn(
        "flip-card cursor-pointer",
        isFlipped && "flip-card-active"
      )}
      style={{ width: '250px', height: '390px' }} // Increased width for better skill name visibility
      onClick={handleCardClick}
    >
      <div className={cn(
        "flip-card-inner",
        isFlipped && "flip-card-flipped"
      )}>
        {/* Front of Card - Image and Name */}
        <div className="flip-card-front">
          <div className="w-full h-full flex flex-col">
            {/* Image - takes all available space */}
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
            {/* Name at bottom only */}
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
            </div>
          </div>
        </div>

        {/* Back of Card - Details */}
        <div className="flip-card-back">
          <div className="w-full h-full flex flex-col">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
              {/* Tabs List at top */}
              <div className="px-4 pt-2 pb-2 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="attributes" className="text-xs">ATB</TabsTrigger>
                  <TabsTrigger value="skills" className="text-xs">PER</TabsTrigger>
                  <TabsTrigger value="habilities" className="text-xs">HAB</TabsTrigger>
                  <TabsTrigger value="combat" className="text-xs">COM</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Tab Content */}
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

                    {/* FOR - centered */}
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
                    {/* Perícias Treinadas */}
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
                                title={isRolling ? "Enviando..." : "Rolar dado no Discord"}
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
                    
                    {/* Separador */}
                    {trainedSkills.length > 0 && untrainedSkills.length > 0 && (
                      <div className="border-t border-border/30 my-2"></div>
                    )}
                    
                    {/* Outras Perícias */}
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
                                title={isRolling ? "Enviando..." : "Rolar dado no Discord"}
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-primary">Habilidades</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchAvailableAbilities();
                            setShowAbilityEquipDialog(true);
                          }}
                        >
                          + Adicionar
                        </Button>
                      </div>
                      {characterAbilities.length > 0 ? (
                        <div className="space-y-2 mb-4">
                          {characterAbilities.map((ca) => (
                            <div key={ca.id} className="flex items-start gap-2 p-2 bg-secondary/30 rounded text-xs">
                              {ca.ability.image_url && (
                                <img
                                  src={ca.ability.image_url}
                                  alt={ca.ability.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{ca.ability.name}</div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {ca.ability.description}
                                </p>
                                {ca.ability.effect && (
                                  <div className="text-[10px] text-primary mt-1 font-medium">
                                    {ca.ability.effect}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnequipAbility(ca.id);
                                }}
                                title="Remover habilidade"
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2 mb-4">
                          Nenhuma habilidade. Clique em "+ Adicionar" para adicionar.
                        </p>
                      )}

                      {/* Separador */}
                      {characterAbilities.length > 0 && (
                        <div className="border-t border-border/30 my-2"></div>
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
            
            {/* Name and actions at bottom - Always visible */}
            <div 
              className="px-4 py-3 border-t flex-shrink-0 flex items-center justify-between gap-2"
              style={{ 
                borderColor: `hsl(var(--primary) / 0.3)`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              }}
            >
              <h3 className="font-display font-bold text-lg truncate flex-1" style={{ color: `hsl(var(--primary))` }}>
                {character.name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  ✏️
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  🗑️
                </Button>
              </div>
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

      {/* Ability Equip Dialog */}
      <Dialog open={showAbilityEquipDialog} onOpenChange={setShowAbilityEquipDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Adicionar Habilidade</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isLoadingAvailable ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : availableAbilities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma habilidade disponível.</p>
                <p className="text-sm mt-2">Crie habilidades na página de Habilidades primeiro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableAbilities.map((ability) => {
                  const isEquipped = characterAbilities.some(ca => ca.ability.id === ability.id);
                  return (
                    <div
                      key={ability.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        isEquipped
                          ? "bg-primary/10 border-primary/30 opacity-50"
                          : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isEquipped) {
                          handleEquipAbility(ability.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {ability.image_url && (
                          <img
                            src={ability.image_url}
                            alt={ability.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{ability.name}</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {ability.description}
                          </p>
                          {ability.effect && (
                            <div className="text-xs text-primary mt-1 font-medium">
                              {ability.effect}
                            </div>
                          )}
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
    </div>
  );
}
