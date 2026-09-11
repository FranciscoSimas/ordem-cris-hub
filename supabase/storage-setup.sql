-- ============================================
-- Setup do Storage para Imagens de Personagens
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar bucket para imagens de personagens (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuários podem fazer upload de suas próprias imagens
CREATE POLICY "Users can upload own character images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem ver todas as imagens (públicas)
CREATE POLICY "Anyone can view character images"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

-- Política: Usuários podem atualizar suas próprias imagens
CREATE POLICY "Users can update own character images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem deletar suas próprias imagens
CREATE POLICY "Users can delete own character images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

