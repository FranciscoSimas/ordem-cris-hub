-- ============================================
-- Tabela de Campanhas
-- ============================================

-- Criar tabela de campanhas
DROP TABLE IF EXISTS public.campaigns CASCADE;
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  main_protagonists_count INTEGER NOT NULL DEFAULT 1 CHECK (main_protagonists_count >= 1),
  characters JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de IDs de personagens
  documents JSONB DEFAULT '[]'::jsonb, -- Array de documentos (nome, url, etc)
  master_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver campanhas onde são mestres ou onde seus personagens estão incluídos
DROP POLICY IF EXISTS "Users can view campaigns" ON public.campaigns;
CREATE POLICY "Users can view campaigns"
  ON public.campaigns
  FOR SELECT
  USING (
    auth.uid() = master_user_id
    OR
    auth.uid() = user_id
    OR
    (characters::jsonb ? auth.uid()::text)
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Usuários podem criar campanhas
DROP POLICY IF EXISTS "Users can insert campaigns" ON public.campaigns;
CREATE POLICY "Users can insert campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Apenas o criador ou o mestre podem atualizar campanhas
DROP POLICY IF EXISTS "Users can update campaigns" ON public.campaigns;
CREATE POLICY "Users can update campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    auth.uid() = master_user_id
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    auth.uid() = master_user_id
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Apenas o criador pode deletar campanhas
DROP POLICY IF EXISTS "Users can delete campaigns" ON public.campaigns;
CREATE POLICY "Users can delete campaigns"
  ON public.campaigns
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_campaigns_master_user_id ON public.campaigns(master_user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);

