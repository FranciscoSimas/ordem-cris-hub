-- ============================================
-- Permitir que qualquer usuário autenticado veja roles de admin
-- (Necessário para filtrar admins da lista de permissões)
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- Adicionar política para ver roles de admin (não causa recursão porque não verifica o role do usuário atual)
DROP POLICY IF EXISTS "Users can view admin roles" ON public.user_roles;
CREATE POLICY "Users can view admin roles"
  ON public.user_roles
  FOR SELECT
  USING (
    -- Allow viewing any role if it's 'admin' (for filtering purposes)
    role = 'admin'::app_role
    OR
    -- Or if it's the user's own role
    auth.uid() = user_id
  );

-- Agora qualquer usuário pode ver quais usuários são admin (para filtrar da lista)

