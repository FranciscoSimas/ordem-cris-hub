-- ============================================
-- Políticas de Storage para character-images
-- ============================================
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- ============================================

-- Verificar se o bucket existe (criar manualmente se não existir)
-- Vá em Storage > Buckets > New bucket
-- Name: character-images
-- Public bucket: ✅ (marcado)

-- Criar políticas usando a função do Supabase
-- Estas políticas permitem que usuários autenticados façam upload de suas próprias imagens

-- Política para INSERT (Upload)
INSERT INTO storage.policies (name, bucket_id, definition, check_expression, command)
VALUES (
  'character-images-insert',
  'character-images',
  '(bucket_id = ''character-images''::text)',
  '(bucket_id = ''character-images''::text) AND (auth.role() = ''authenticated''::text)',
  'INSERT'
)
ON CONFLICT DO NOTHING;

-- Política para SELECT (Visualizar)
INSERT INTO storage.policies (name, bucket_id, definition, check_expression, command)
VALUES (
  'character-images-select',
  'character-images',
  '(bucket_id = ''character-images''::text)',
  '(bucket_id = ''character-images''::text)',
  'SELECT'
)
ON CONFLICT DO NOTHING;

-- Política para UPDATE
INSERT INTO storage.policies (name, bucket_id, definition, check_expression, command)
VALUES (
  'character-images-update',
  'character-images',
  '(bucket_id = ''character-images''::text)',
  '(bucket_id = ''character-images''::text) AND (auth.role() = ''authenticated''::text)',
  'UPDATE'
)
ON CONFLICT DO NOTHING;

-- Política para DELETE
INSERT INTO storage.policies (name, bucket_id, definition, check_expression, command)
VALUES (
  'character-images-delete',
  'character-images',
  '(bucket_id = ''character-images''::text)',
  '(bucket_id = ''character-images''::text) AND (auth.role() = ''authenticated''::text)',
  'DELETE'
)
ON CONFLICT DO NOTHING;

