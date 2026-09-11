-- ============================================
-- Adicionar Sistema de Compartilhamento de Habilidades
-- ============================================
-- Execute este script no SQL Editor do Supabase
--
-- Este script adiciona a capacidade de compartilhar habilidades
-- com usuários específicos (além de globais e próprias)

-- Adicionar coluna shared_users (array de UUIDs dos usuários que podem ver/usar a habilidade)
ALTER TABLE public.abilities 
ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN public.abilities.shared_users IS 'Array de UUIDs dos usuários que têm permissão para ver e usar esta habilidade (além do dono)';

-- Atualizar política RLS para permitir visualização baseada em compartilhamento
DROP POLICY IF EXISTS "Users can view global abilities and their own" ON public.abilities;
CREATE POLICY "Users can view global abilities and their own"
  ON public.abilities FOR SELECT
  USING (
    -- Habilidade é global (disponível para todos)
    is_global = true 
    OR 
    -- Usuário é o dono
    user_id = auth.uid()
    OR
    -- Usuário está na lista de compartilhamento
    (shared_users::jsonb ? auth.uid()::text)
    OR
    -- Admin pode ver todas
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Índice GIN para melhor performance nas buscas por shared_users
CREATE INDEX IF NOT EXISTS idx_abilities_shared_users ON public.abilities USING GIN (shared_users);

-- ============================================
-- EXEMPLO DE USO:
-- ============================================
-- Para compartilhar uma habilidade com usuários específicos:
--
-- UPDATE public.abilities
-- SET shared_users = '["uuid-usuario-1", "uuid-usuario-2"]'::jsonb
-- WHERE id = 'id-da-habilidade' AND user_id = auth.uid();
--
-- Para adicionar um usuário à lista de compartilhamento:
--
-- UPDATE public.abilities
-- SET shared_users = shared_users || '["novo-uuid-usuario"]'::jsonb
-- WHERE id = 'id-da-habilidade' AND user_id = auth.uid();
--
-- Para remover um usuário da lista:
--
-- UPDATE public.abilities
-- SET shared_users = shared_users - 'uuid-usuario-remover'
-- WHERE id = 'id-da-habilidade' AND user_id = auth.uid();

