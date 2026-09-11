-- ============================================
-- Script para Atribuir Roles aos Usuários
-- ============================================
-- Execute este script DEPOIS de criar os usuários no Supabase Auth
-- 
-- INSTRUÇÕES:
-- 1. Vá em Authentication > Users no Supabase
-- 2. Crie 3 usuários (ou use os existentes)
-- 3. Copie os UUIDs dos usuários
-- 4. Substitua os UUIDs abaixo pelos UUIDs reais
-- 5. Execute este script
-- ============================================

-- Exemplo de como atribuir roles:
-- (Substitua 'USER_UUID_AQUI' pelos UUIDs reais dos seus usuários)

-- Admin User
-- UPDATE public.user_roles 
-- SET role = 'admin' 
-- WHERE user_id = 'USER_UUID_AQUI';

-- Master User
-- UPDATE public.user_roles 
-- SET role = 'master' 
-- WHERE user_id = 'USER_UUID_AQUI';

-- Player User (já é o padrão, mas pode ser explícito)
-- UPDATE public.user_roles 
-- SET role = 'player' 
-- WHERE user_id = 'USER_UUID_AQUI';

-- ============================================
-- OU use este formato para inserir diretamente:
-- ============================================

-- Inserir/Atualizar Role de Admin
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_UUID_ADMIN', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Inserir/Atualizar Role de Master
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_UUID_MASTER', 'master')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'master';

-- Inserir/Atualizar Role de Player
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_UUID_PLAYER', 'player')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'player';

-- ============================================
-- Para atualizar o display_name dos perfis:
-- ============================================

-- UPDATE public.profiles 
-- SET display_name = 'Nome do Admin'
-- WHERE id = 'USER_UUID_ADMIN';

-- UPDATE public.profiles 
-- SET display_name = 'Nome do Master'
-- WHERE id = 'USER_UUID_MASTER';

-- UPDATE public.profiles 
-- SET display_name = 'Nome do Player'
-- WHERE id = 'USER_UUID_PLAYER';

