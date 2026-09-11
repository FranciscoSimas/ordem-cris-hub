-- ============================================
-- Adicionar campo selected_campaign_id ao perfil
-- ============================================
-- Permite salvar qual campanha o usuário está mestrando atualmente

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.selected_campaign_id IS 'ID da campanha que o usuário está mestrando atualmente';

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_selected_campaign_id ON public.profiles(selected_campaign_id);

