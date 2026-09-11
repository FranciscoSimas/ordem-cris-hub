-- ============================================
-- Tabela de Habilidades
-- ============================================

CREATE TABLE IF NOT EXISTS public.abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'futurista', 'medieval', 'atual', 'generica', 'magica', 'tecnologica', 'outra'
  description TEXT NOT NULL,
  effect TEXT, -- Efeito da habilidade (ex: '+2 em Percepção', 'Cura 1d6+2 PV')
  image_url TEXT, -- URL da imagem
  is_global BOOLEAN DEFAULT false, -- true = disponível para todos os usuários
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_abilities_updated_at
  BEFORE UPDATE ON public.abilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.abilities ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver habilidades globais e suas próprias
CREATE POLICY "Users can view global abilities and their own"
  ON public.abilities FOR SELECT
  USING (
    is_global = true 
    OR user_id = auth.uid()
  );

-- Política: Usuários podem criar suas próprias habilidades
CREATE POLICY "Users can create their own abilities"
  ON public.abilities FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem atualizar suas próprias habilidades
CREATE POLICY "Users can update their own abilities"
  ON public.abilities FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem deletar suas próprias habilidades
CREATE POLICY "Users can delete their own abilities"
  ON public.abilities FOR DELETE
  USING (user_id = auth.uid());

-- Política: Admins podem fazer tudo
CREATE POLICY "Admins can do everything with abilities"
  ON public.abilities
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_abilities_user_id ON public.abilities(user_id);
CREATE INDEX IF NOT EXISTS idx_abilities_category ON public.abilities(category);
CREATE INDEX IF NOT EXISTS idx_abilities_is_global ON public.abilities(is_global);

