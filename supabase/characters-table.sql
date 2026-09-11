-- ============================================
-- Tabela de Personagens (NPCs)
-- ============================================

-- Criar tabela de personagens
DROP TABLE IF EXISTS public.characters CASCADE;
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  
  -- Atributos (valores de 1 a 5)
  attribute_int INTEGER NOT NULL DEFAULT 1 CHECK (attribute_int >= 1 AND attribute_int <= 5),
  attribute_agi INTEGER NOT NULL DEFAULT 1 CHECK (attribute_agi >= 1 AND attribute_agi <= 5),
  attribute_for INTEGER NOT NULL DEFAULT 1 CHECK (attribute_for >= 1 AND attribute_for <= 5),
  attribute_pre INTEGER NOT NULL DEFAULT 1 CHECK (attribute_pre >= 1 AND attribute_pre <= 5),
  attribute_vig INTEGER NOT NULL DEFAULT 1 CHECK (attribute_vig >= 1 AND attribute_vig <= 5),
  
  -- Perícias principais (JSON para flexibilidade)
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Outros dados (JSON para flexibilidade futura)
  other_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own characters" ON public.characters;
CREATE POLICY "Users can view own characters"
  ON public.characters
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own characters" ON public.characters;
CREATE POLICY "Users can insert own characters"
  ON public.characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own characters" ON public.characters;
CREATE POLICY "Users can update own characters"
  ON public.characters
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own characters" ON public.characters;
CREATE POLICY "Users can delete own characters"
  ON public.characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_updated_at_characters ON public.characters;
CREATE TRIGGER set_updated_at_characters
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON public.characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON public.characters(created_at DESC);

