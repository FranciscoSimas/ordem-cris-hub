-- ============================================
-- Tabela de Habilidades Equipadas em Personagens
-- ============================================

CREATE TABLE IF NOT EXISTS public.character_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  ability_id UUID NOT NULL REFERENCES public.abilities(id) ON DELETE CASCADE,
  notes TEXT, -- Notas sobre esta habilidade específica do personagem
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (character_id, ability_id) -- Um personagem não pode ter a mesma habilidade duplicada
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_character_abilities_updated_at
  BEFORE UPDATE ON public.character_abilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.character_abilities ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver habilidades de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can view character abilities" ON public.character_abilities;
CREATE POLICY "Users can view character abilities"
  ON public.character_abilities
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

-- Política: Usuários podem adicionar habilidades a personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can insert character abilities" ON public.character_abilities;
CREATE POLICY "Users can insert character abilities"
  ON public.character_abilities
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

-- Política: Usuários podem atualizar habilidades de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can update character abilities" ON public.character_abilities;
CREATE POLICY "Users can update character abilities"
  ON public.character_abilities
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

-- Política: Usuários podem deletar habilidades de personagens que possuem ou que têm permissão
DROP POLICY IF EXISTS "Users can delete character abilities" ON public.character_abilities;
CREATE POLICY "Users can delete character abilities"
  ON public.character_abilities
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_character_abilities_character_id ON public.character_abilities(character_id);
CREATE INDEX IF NOT EXISTS idx_character_abilities_ability_id ON public.character_abilities(ability_id);

