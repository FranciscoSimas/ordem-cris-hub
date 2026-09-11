-- ============================================
-- Tabela de Sessões de Campanha
-- ============================================

-- Criar tabela de sessões
DROP TABLE IF EXISTS public.campaign_sessions CASCADE;
CREATE TABLE public.campaign_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  session_date DATE,
  notes TEXT, -- Notas da sessão
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, session_number) -- Número de sessão único por campanha
);

-- Habilitar RLS
ALTER TABLE public.campaign_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver sessões de campanhas que podem ver
DROP POLICY IF EXISTS "Users can view campaign sessions" ON public.campaign_sessions;
CREATE POLICY "Users can view campaign sessions"
  ON public.campaign_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_sessions.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR (campaigns.characters::jsonb ? auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem inserir sessões
DROP POLICY IF EXISTS "Masters can insert campaign sessions" ON public.campaign_sessions;
CREATE POLICY "Masters can insert campaign sessions"
  ON public.campaign_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_sessions.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem atualizar
DROP POLICY IF EXISTS "Masters can update campaign sessions" ON public.campaign_sessions;
CREATE POLICY "Masters can update campaign sessions"
  ON public.campaign_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_sessions.campaign_id
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
      WHERE campaigns.id = campaign_sessions.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Apenas mestres ou criadores podem deletar
DROP POLICY IF EXISTS "Masters can delete campaign sessions" ON public.campaign_sessions;
CREATE POLICY "Masters can delete campaign sessions"
  ON public.campaign_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_sessions.campaign_id
      AND (
        campaigns.master_user_id = auth.uid()
        OR campaigns.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_campaign_sessions_campaign_id ON public.campaign_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sessions_date ON public.campaign_sessions(session_date DESC);

