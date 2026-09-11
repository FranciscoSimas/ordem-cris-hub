-- ============================================
-- Tabelas Atualizadas de Armas e Itens
-- ============================================

-- 0. Criar função para atualizar updated_at (se não existir)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Atualizar tabela de Armas
-- ============================================
DROP TABLE IF EXISTS public.weapons CASCADE;
CREATE TABLE public.weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null = item global do sistema
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'antiga', 'nova', 'arma_fogo', 'cibernetica', 'medieval', 'outra'
  type TEXT NOT NULL, -- 'corpo_a_corpo', 'distancia', 'arremesso', etc.
  damage TEXT NOT NULL, -- ex: '2d6+2'
  modifier TEXT, -- ex: '+FOR'
  range TEXT, -- ex: 'Corpo a Corpo', '15m', etc.
  weight TEXT, -- ex: '1kg'
  description TEXT,
  image_url TEXT, -- URL da imagem
  is_global BOOLEAN DEFAULT false, -- true = disponível para todos os usuários
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Atualizar tabela de Itens
-- ============================================
DROP TABLE IF EXISTS public.items CASCADE;
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null = item global do sistema
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'consumivel', 'equipamento', 'utilidade', 'magico', 'tecnologico', 'outra'
  description TEXT,
  effect TEXT, -- Efeito do item (ex: '+2 em Percepção')
  weight TEXT, -- ex: '0.5kg'
  image_url TEXT, -- URL da imagem
  is_global BOOLEAN DEFAULT false, -- true = disponível para todos os usuários
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de Armas Equipadas em Personagens
-- ============================================
DROP TABLE IF EXISTS public.character_weapons CASCADE;
CREATE TABLE public.character_weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  weapon_id UUID NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
  equipped BOOLEAN DEFAULT true, -- Se está equipada ou apenas no inventário
  notes TEXT, -- Notas sobre esta arma específica do personagem
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (character_id, weapon_id) -- Um personagem não pode ter a mesma arma duplicada
);

-- 4. Tabela de Itens Equipados em Personagens
-- ============================================
DROP TABLE IF EXISTS public.character_items CASCADE;
CREATE TABLE public.character_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1, -- Quantidade do item
  equipped BOOLEAN DEFAULT false, -- Se está equipado ou apenas no inventário
  notes TEXT, -- Notas sobre este item específico do personagem
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (character_id, item_id) -- Um personagem não pode ter o mesmo item duplicado (usa quantity)
);

-- 5. Habilitar RLS
-- ============================================
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_items ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para Weapons
-- ============================================
-- Usuários podem ver armas globais e suas próprias armas
DROP POLICY IF EXISTS "Users can view weapons" ON public.weapons;
CREATE POLICY "Users can view weapons"
  ON public.weapons
  FOR SELECT
  USING (
    is_global = true
    OR
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem inserir suas próprias armas
DROP POLICY IF EXISTS "Users can insert own weapons" ON public.weapons;
CREATE POLICY "Users can insert own weapons"
  ON public.weapons
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem atualizar suas próprias armas ou admins podem atualizar qualquer arma
DROP POLICY IF EXISTS "Users can update weapons" ON public.weapons;
CREATE POLICY "Users can update weapons"
  ON public.weapons
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem deletar suas próprias armas ou admins podem deletar qualquer arma
DROP POLICY IF EXISTS "Users can delete weapons" ON public.weapons;
CREATE POLICY "Users can delete weapons"
  ON public.weapons
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. Políticas RLS para Items
-- ============================================
-- Usuários podem ver itens globais e seus próprios itens
DROP POLICY IF EXISTS "Users can view items" ON public.items;
CREATE POLICY "Users can view items"
  ON public.items
  FOR SELECT
  USING (
    is_global = true
    OR
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem inserir seus próprios itens
DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
CREATE POLICY "Users can insert own items"
  ON public.items
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem atualizar seus próprios itens ou admins podem atualizar qualquer item
DROP POLICY IF EXISTS "Users can update items" ON public.items;
CREATE POLICY "Users can update items"
  ON public.items
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem deletar seus próprios itens ou admins podem deletar qualquer item
DROP POLICY IF EXISTS "Users can delete items" ON public.items;
CREATE POLICY "Users can delete items"
  ON public.items
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 8. Políticas RLS para Character Weapons
-- ============================================
-- Usuários podem ver armas de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can view character weapons" ON public.character_weapons;
CREATE POLICY "Users can view character weapons"
  ON public.character_weapons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem inserir armas em personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can insert character weapons" ON public.character_weapons;
CREATE POLICY "Users can insert character weapons"
  ON public.character_weapons
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem atualizar armas de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can update character weapons" ON public.character_weapons;
CREATE POLICY "Users can update character weapons"
  ON public.character_weapons
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem deletar armas de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can delete character weapons" ON public.character_weapons;
CREATE POLICY "Users can delete character weapons"
  ON public.character_weapons
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- 9. Políticas RLS para Character Items
-- ============================================
-- Usuários podem ver itens de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can view character items" ON public.character_items;
CREATE POLICY "Users can view character items"
  ON public.character_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem inserir itens em personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can insert character items" ON public.character_items;
CREATE POLICY "Users can insert character items"
  ON public.character_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem atualizar itens de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can update character items" ON public.character_items;
CREATE POLICY "Users can update character items"
  ON public.character_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Usuários podem deletar itens de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can delete character items" ON public.character_items;
CREATE POLICY "Users can delete character items"
  ON public.character_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id
      AND (
        c.user_id = auth.uid()
        OR
        (c.allowed_users::jsonb ? auth.uid()::text)
        OR
        public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- 10. Triggers para updated_at
-- ============================================
CREATE TRIGGER set_updated_at_weapons
  BEFORE UPDATE ON public.weapons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_character_weapons
  BEFORE UPDATE ON public.character_weapons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_character_items
  BEFORE UPDATE ON public.character_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Índices para melhor performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_weapons_user_id ON public.weapons(user_id);
CREATE INDEX IF NOT EXISTS idx_weapons_category ON public.weapons(category);
CREATE INDEX IF NOT EXISTS idx_weapons_is_global ON public.weapons(is_global);

CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_is_global ON public.items(is_global);

CREATE INDEX IF NOT EXISTS idx_character_weapons_character_id ON public.character_weapons(character_id);
CREATE INDEX IF NOT EXISTS idx_character_weapons_weapon_id ON public.character_weapons(weapon_id);

CREATE INDEX IF NOT EXISTS idx_character_items_character_id ON public.character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_character_items_item_id ON public.character_items(item_id);

