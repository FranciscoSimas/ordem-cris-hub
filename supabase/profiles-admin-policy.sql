-- ============================================
-- Permitir que Admin veja todos os Profiles
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- Adicionar política para admin ver todos os profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Agora admins podem ver todos os profiles para gerenciar permissões

