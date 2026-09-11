-- ============================================
-- CORRIGIR: Habilidades sem user_id
-- ============================================
-- 
-- PROBLEMA: Se você executou o script no SQL Editor sem estar autenticado,
-- as habilidades podem ter sido inseridas com user_id = NULL
--
-- SOLUÇÃO: Este script corrige as habilidades que têm user_id NULL
-- atribuindo-as ao usuário atual (auth.uid())
--
-- INSTRUÇÕES:
-- 1. Certifique-se de estar logado no Supabase Dashboard
-- 2. Execute este script no SQL Editor
-- 3. Isso vai corrigir todas as habilidades sem user_id

-- Verificar quantas habilidades precisam ser corrigidas
SELECT 
  COUNT(*) as habilidades_sem_user_id
FROM public.abilities 
WHERE user_id IS NULL;

-- Corrigir habilidades sem user_id (atribuir ao usuário atual)
UPDATE public.abilities 
SET 
  user_id = auth.uid(),
  updated_at = now()
WHERE user_id IS NULL;

-- Verificar resultado
SELECT 
  COUNT(*) as habilidades_corrigidas,
  '✅ Habilidades corrigidas!' as status
FROM public.abilities 
WHERE user_id = auth.uid();

