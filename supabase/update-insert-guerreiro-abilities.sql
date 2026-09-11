-- ============================================
-- ATUALIZAR HABILIDADES 1 E 2 E INSERIR 8 HABILIDADES DO GUERREIRO
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Se necessário, ajuste os IDs das habilidades 1 e 2 no UPDATE abaixo
-- 3. As 8 novas habilidades do Guerreiro serão inseridas automaticamente
--
-- NOTA: Se você souber os IDs exatos das habilidades 1 e 2, substitua no UPDATE
-- Caso contrário, descomente a linha de SELECT para ver quais são

-- ============================================
-- PASSO 1: Verificar quais são as habilidades 1 e 2
-- ============================================
-- Descomente a linha abaixo para ver suas habilidades atuais:
-- SELECT id, name, category, description FROM public.abilities WHERE user_id = auth.uid() ORDER BY created_at LIMIT 2;

-- ============================================
-- PASSO 2: Atualizar Habilidades 1 e 2
-- ============================================
-- Substitua 'ID_HABILIDADE_1' e 'ID_HABILIDADE_2' pelos IDs reais
-- OU use os nomes das habilidades se preferir

-- Opção A: Atualizar por ID (substitua os UUIDs)
-- UPDATE public.abilities 
-- SET 
--   name = 'Novo Nome da Habilidade 1',
--   category = 'categoria',
--   description = 'Nova descrição',
--   effect = 'Novo efeito',
--   updated_at = now()
-- WHERE id = 'ID_HABILIDADE_1' AND user_id = auth.uid();

-- UPDATE public.abilities 
-- SET 
--   name = 'Novo Nome da Habilidade 2',
--   category = 'categoria',
--   description = 'Nova descrição',
--   effect = 'Novo efeito',
--   updated_at = now()
-- WHERE id = 'ID_HABILIDADE_2' AND user_id = auth.uid();

-- Opção B: Atualizar as 2 primeiras habilidades criadas (por ordem de criação)
-- ATENÇÃO: Isso atualiza as 2 habilidades mais antigas. Se quiser atualizar por nome específico, use a Opção C abaixo.

UPDATE public.abilities 
SET 
  name = 'Decapitar',
  category = 'generica',
  description = '1x por Cena. O Jogador tenta decapitar um ser do seu tamanho ou menor. É necessário DT 30 (Luta ou Pontaria) para acertar o golpe. Se falhar, perde a rodada, fica com -5 na Defesa até o início do seu próximo turno e não causa dano. Se for bem-sucedido, o alvo é imediatamente decapitado/neutralizado (chefes podem sobreviver se tiverem múltiplas fases ou PV altos).',
  effect = 'DT 30 (Luta ou Pontaria). Se falhar: -5 Defesa até próximo turno. Se acertar: decapitação instantânea.',
  updated_at = now()
WHERE id IN (
  SELECT id FROM public.abilities 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1
);

UPDATE public.abilities 
SET 
  name = 'Grito de Guerra',
  category = 'generica',
  description = 'O Jogador profere um grito ensurdecedor, chamando todos os inimigos em alcance Médio (6m) para lutar com Ele. Os inimigos afetados devem fazer um teste de Vontade (DT 20). Se falharem, só podem atacar o Jogador no seu próximo turno.',
  effect = '3 PE. Alcance Médio (6m). Inimigos fazem Vontade (DT 20). Se falharem, só atacam o Jogador no próximo turno.',
  updated_at = now()
WHERE id IN (
  SELECT id FROM public.abilities 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1 OFFSET 1
);

-- Opção C: Atualizar por nome específico (descomente e ajuste os nomes se preferir)
-- UPDATE public.abilities 
-- SET 
--   name = 'Decapitar',
--   category = 'generica',
--   description = '1x por Cena. O Jogador tenta decapitar um ser do seu tamanho ou menor. É necessário DT 30 (Luta ou Pontaria) para acertar o golpe. Se falhar, perde a rodada, fica com -5 na Defesa até o início do seu próximo turno e não causa dano. Se for bem-sucedido, o alvo é imediatamente decapitado/neutralizado (chefes podem sobreviver se tiverem múltiplas fases ou PV altos).',
--   effect = 'DT 30 (Luta ou Pontaria). Se falhar: -5 Defesa até próximo turno. Se acertar: decapitação instantânea.',
--   updated_at = now()
-- WHERE user_id = auth.uid() AND name = 'NOME_DA_HABILIDADE_1_AQUI';
--
-- UPDATE public.abilities 
-- SET 
--   name = 'Grito de Guerra',
--   category = 'generica',
--   description = 'O Jogador profere um grito ensurdecedor, chamando todos os inimigos em alcance Médio (6m) para lutar com Ele. Os inimigos afetados devem fazer um teste de Vontade (DT 20). Se falharem, só podem atacar o Jogador no seu próximo turno.',
--   effect = '3 PE. Alcance Médio (6m). Inimigos fazem Vontade (DT 20). Se falharem, só atacam o Jogador no próximo turno.',
--   updated_at = now()
-- WHERE user_id = auth.uid() AND name = 'NOME_DA_HABILIDADE_2_AQUI';

-- ============================================
-- PASSO 3: Inserir as 8 Habilidades do Guerreiro
-- ============================================

INSERT INTO public.abilities (user_id, name, category, description, effect, image_url, is_global)
VALUES
  -- 3. Guardião da Tríade
  (
    auth.uid(),
    'Guardião da Tríade',
    'generica',
    'O Jogador assume uma posição defensiva. Até o início do seu próximo turno, qualquer aliado a até 3m dele que seja alvo de um ataque pode usar a Defesa do Jogador e distribuir o dano pela metade (metade para o Jogador e metade para o Aliado). Excelente para mitigar dano de área ou proteger o Mago/Ladina de golpes críticos.',
    '2 PE. Aliados a até 3m podem usar Defesa do Jogador e dividir dano pela metade.',
    NULL,
    false
  ),
  
  -- 4. Pisotão da Terra
  (
    auth.uid(),
    'Pisotão da Terra',
    'generica',
    'O Jogador desfere um golpe massivo no chão. Todos os inimigos em alcance Médio (6m) à sua frente (num cone) devem fazer um teste de Reflexos (DT 25). Se falhar, sofre dano de 2d6 e fica Caído. Se tiver sucesso, sofre metade do dano e permanece em pé.',
    '3 PE. Cone 6m. Reflexos (DT 25). Falha: 2d6 dano + Caído. Sucesso: metade do dano.',
    NULL,
    false
  ),
  
  -- 5. Ataque Mortal
  (
    auth.uid(),
    'Ataque Mortal',
    'generica',
    'O Jogador carrega um ataque focado por 1 rodada, concentrando a energia. Durante o carregamento, Ele não pode se esquivar, contra-atacar ou usar Reações (só Defesa Natural). No início do seu próximo turno, o ataque é desferido, recebendo +1 dado de dano (além do dano normal da arma). Se o Jogador sofrer qualquer dano durante o carregamento, o ataque é cancelado. Requer que Lyra ou Irys o protejam (com cura, fumaça ou provocação) para garantir o ataque no turno seguinte.',
    '3 PE. Carrega 1 rodada. +1 dado de dano. Se sofrer dano durante carregamento, cancela.',
    NULL,
    false
  ),
  
  -- 6. Investida Brutal
  (
    auth.uid(),
    'Investida Brutal',
    'generica',
    'O Jogador avança até 12m em linha reta (ignora terreno difícil) e ataca o primeiro inimigo no caminho. O ataque recebe um Bônus de +3 no Dano final. Se acertar o golpe (DT 25 Luta), o alvo fica Atordoado até o início do seu próximo turno. Pode ser usada para desengajar.',
    '2 PE. Avança 12m em linha reta. +3 Dano. Se acertar (DT 25 Luta): Atordoado até próximo turno.',
    NULL,
    false
  ),
  
  -- 7. Determinação do Líder
  (
    auth.uid(),
    'Determinação do Líder',
    'generica',
    'O Jogador inspira todos os aliados em alcance Curto (9m). Eles ganham +2 na Perícia Luta e +2 na Defesa contra ataques de inimigos até o final do combate (ou cena).',
    '2 PE. Alcance Curto (9m). Aliados ganham +2 Luta e +2 Defesa até fim do combate.',
    NULL,
    false
  ),
  
  -- 8. Rebate Defensivo
  (
    auth.uid(),
    'Rebate Defensivo',
    'generica',
    'Reação. Quando um inimigo adjacente falha um ataque corpo a corpo contra o Jogador, Ele pode usar esta habilidade. O Jogador desfere um ataque de resposta imediatamente, mas com uma penalidade de -5 na rolagem de acerto.',
    '1 PE. Reação. Quando inimigo adjacente falha ataque corpo a corpo: contra-ataque com -5 no acerto.',
    NULL,
    false
  );

-- ============================================
-- VERIFICAÇÃO: Ver todas as habilidades inseridas
-- ============================================
-- Descomente para ver todas as suas habilidades:
-- SELECT id, name, category, effect, created_at 
-- FROM public.abilities 
-- WHERE user_id = auth.uid() 
-- ORDER BY created_at DESC;

