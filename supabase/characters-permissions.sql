-- ============================================
-- Adicionar Sistema de Permissões aos Personagens
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna allowed_users (array de UUIDs dos usuários que podem ver/usar o personagem)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS allowed_users JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN public.characters.allowed_users IS 'Array de UUIDs dos usuários que têm permissão para ver e usar este personagem';

-- Atualizar política RLS para permitir visualização baseada em permissões
DROP POLICY IF EXISTS "Users can view own characters" ON public.characters;
CREATE POLICY "Users can view own characters"
  ON public.characters
  FOR SELECT
  USING (
    -- Usuário é o dono
    auth.uid() = user_id
    OR
    -- Usuário está na lista de permissões
    (allowed_users::jsonb ? auth.uid()::text)
    OR
    -- Admin pode ver todos (usando função has_role)
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Atualizar política de UPDATE para permitir edição apenas pelo dono ou admin
DROP POLICY IF EXISTS "Users can update own characters" ON public.characters;
CREATE POLICY "Users can update own characters"
  ON public.characters
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Índice GIN para melhor performance nas buscas por allowed_users
CREATE INDEX IF NOT EXISTS idx_characters_allowed_users ON public.characters USING GIN (allowed_users);

