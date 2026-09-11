-- ============================================
-- Tabela de Personagens em Campanhas
-- ============================================
-- Relaciona personagens com campanhas e suas categorias/equipas

-- Criar enum para categorias de personagens
DROP TYPE IF EXISTS public.character_category CASCADE;
CREATE TYPE public.character_category AS ENUM (
  'protagonist',  -- Protagonista principal
  'npc',         -- NPC (personagem não-jogador)
  'team',        -- Equipa/Grupo
  'enemy'        -- Inimigo
);

-- Criar tabela de personagens em campanhas
DROP TABLE IF EXISTS public.campaign_characters CASCADE;
CREATE TABLE public.campaign_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  category public.character_category NOT NULL DEFAULT 'npc',
  team_name TEXT, -- Nome da equipe (se category = 'team')
  notes TEXT, -- Notas adicionais sobre o personagem nesta campanha
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, character_id) -- Um personagem só pode aparecer uma vez por campanha
);

-- Habilitar RLS
ALTER TABLE public.campaign_characters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver personagens de campanhas que podem ver
DROP POLICY IF EXISTS "Users can view campaign characters" ON public.campaign_characters;
CREATE POLICY "Users can view campaign characters"
  ON public.campaign_characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_characters.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR (campaigns.characters::jsonb ? auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem inserir personagens
DROP POLICY IF EXISTS "Masters can insert campaign characters" ON public.campaign_characters;
CREATE POLICY "Masters can insert campaign characters"
  ON public.campaign_characters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_characters.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem atualizar
DROP POLICY IF EXISTS "Masters can update campaign characters" ON public.campaign_characters;
CREATE POLICY "Masters can update campaign characters"
  ON public.campaign_characters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_characters.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_characters.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem deletar
DROP POLICY IF EXISTS "Masters can delete campaign characters" ON public.campaign_characters;
CREATE POLICY "Masters can delete campaign characters"
  ON public.campaign_characters
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_characters.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_campaign_characters_campaign_id ON public.campaign_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_character_id ON public.campaign_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_category ON public.campaign_characters(category);

