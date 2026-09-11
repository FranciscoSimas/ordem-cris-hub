-- ============================================
-- Adicionar campo multiplicador_crit na tabela weapons
-- ============================================

ALTER TABLE public.weapons 
ADD COLUMN IF NOT EXISTS multiplier_crit TEXT DEFAULT 'x2'; -- ex: 'x2', 'x3', 'x4'

-- Comentário na coluna
COMMENT ON COLUMN public.weapons.multiplier_crit IS 'Multiplicador de dano crítico (ex: x2, x3, x4). Multiplica os dados primeiro, depois adiciona o modificador.';

