-- ============================================
-- Corrigir Recursão Infinita na Política RLS de user_roles
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- Remover TODAS as políticas de user_roles para recriar corretamente
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recriar apenas a política de visualização própria (sem recursão)
-- Esta política permite que usuários vejam apenas seu próprio role
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Nota: A política "Admins can manage roles" foi removida porque causa recursão infinita
-- Se precisar de gerenciamento de roles, faça isso manualmente no Supabase Dashboard
-- ou crie uma função SECURITY DEFINER que bypassa RLS

