-- Tour App — dados de exemplo (seed) para a região-piloto (SC, PR e SP).
--
-- * Cidades: REAIS (centro aproximado, população aproximada).
-- * Casas de show, produtoras e bandas: FICTÍCIAS. Substitua por cadastros reais.
-- * Idempotente: pode ser executado várias vezes (insert ... on conflict do nothing).
-- * Nenhum UUID fixo: tudo é referenciado por slug via subselect.
--
-- Ordem: cities -> venues -> producers -> producer_cities -> producer_venues -> bands.
-- Pré-requisito: supabase/migrations/0001_init.sql já aplicada.

begin;

-- ---------------------------------------------------------------------------
-- Cidades (reais)
-- ---------------------------------------------------------------------------
insert into public.cities (name, state, slug, lat, lng, population) values
  -- Santa Catarina
  ('Joinville',            'SC', 'joinville-sc',            -26.3045, -48.8487, 616317),
  ('Florianópolis',        'SC', 'florianopolis-sc',        -27.5954, -48.5480, 537211),
  ('Blumenau',             'SC', 'blumenau-sc',             -26.9194, -49.0661, 361855),
  ('Itajaí',               'SC', 'itajai-sc',               -26.9078, -48.6619, 264054),
  ('Balneário Camboriú',   'SC', 'balneario-camboriu-sc',   -26.9906, -48.6349, 139155),
  ('Chapecó',              'SC', 'chapeco-sc',              -27.1004, -52.6152, 254947),
  ('Criciúma',             'SC', 'criciuma-sc',             -28.6775, -49.3697, 214352),
  ('Lages',                'SC', 'lages-sc',                -27.8160, -50.3260, 164981),
  ('Jaraguá do Sul',       'SC', 'jaragua-do-sul-sc',       -26.4851, -49.0713, 182660),
  ('Tubarão',              'SC', 'tubarao-sc',              -28.4713, -49.0144, 107614),
  ('São José',             'SC', 'sao-jose-sc',             -27.6136, -48.6366, 258585),
  ('Brusque',              'SC', 'brusque-sc',              -27.0979, -48.9107, 141385),
  ('Rio do Sul',           'SC', 'rio-do-sul-sc',           -27.2143, -49.6430,  72938),
  ('Caçador',              'SC', 'cacador-sc',              -26.7757, -51.0150,  78590),
  ('Concórdia',            'SC', 'concordia-sc',            -27.2335, -52.0238,  76112),
  ('Palhoça',              'SC', 'palhoca-sc',              -27.6455, -48.6697, 222598),
  ('São Bento do Sul',     'SC', 'sao-bento-do-sul-sc',     -26.2504, -49.3784,  83933),
  ('Mafra',                'SC', 'mafra-sc',                -26.1115, -49.8053,  56151),
  ('Canoinhas',            'SC', 'canoinhas-sc',            -26.1770, -50.3900,  51836),
  ('Araranguá',            'SC', 'ararangua-sc',            -28.9357, -49.4897,  69897),
  ('Joaçaba',              'SC', 'joacaba-sc',              -27.1721, -51.5047,  29803),
  ('Videira',              'SC', 'videira-sc',              -27.0086, -51.1521,  54248),
  ('Xanxerê',              'SC', 'xanxere-sc',              -26.8769, -52.4043,  51164),
  ('Laguna',               'SC', 'laguna-sc',               -28.4826, -48.7808,  44781),
  ('Navegantes',           'SC', 'navegantes-sc',           -26.8940, -48.6540,  86409),
  ('Içara',                'SC', 'icara-sc',                -28.7134, -49.3003,  57960),
  ('Indaial',              'SC', 'indaial-sc',              -26.8977, -49.2317,  73187),
  -- Paraná
  ('Curitiba',             'PR', 'curitiba-pr',             -25.4284, -49.2733, 1773718),
  ('Londrina',             'PR', 'londrina-pr',             -23.3045, -51.1696,  555965),
  ('Maringá',              'PR', 'maringa-pr',              -23.4205, -51.9333,  409657),
  ('Ponta Grossa',         'PR', 'ponta-grossa-pr',         -25.0916, -50.1668,  358838),
  ('Cascavel',             'PR', 'cascavel-pr',             -24.9555, -53.4552,  348051),
  ('Foz do Iguaçu',        'PR', 'foz-do-iguacu-pr',        -25.5478, -54.5882,  285415),
  ('Guarapuava',           'PR', 'guarapuava-pr',           -25.3907, -51.4628,  182093),
  ('Paranaguá',            'PR', 'paranagua-pr',            -25.5205, -48.5095,  145829),
  ('Toledo',               'PR', 'toledo-pr',               -24.7199, -53.7433,  158078),
  ('Apucarana',            'PR', 'apucarana-pr',            -23.5509, -51.4607,  136234),
  ('Umuarama',             'PR', 'umuarama-pr',             -23.7661, -53.3206,  114030),
  ('Pato Branco',          'PR', 'pato-branco-pr',          -26.2291, -52.6707,   88329),
  ('Francisco Beltrão',    'PR', 'francisco-beltrao-pr',    -26.0811, -53.0550,   97392),
  ('Campo Mourão',         'PR', 'campo-mourao-pr',         -24.0458, -52.3783,   91648),
  ('Paranavaí',            'PR', 'paranavai-pr',            -23.0816, -52.4617,   85900),
  ('União da Vitória',     'PR', 'uniao-da-vitoria-pr',     -26.2273, -51.0872,   56170),
  ('Irati',                'PR', 'irati-pr',                -25.4671, -50.6513,   61310),
  ('Telêmaco Borba',       'PR', 'telemaco-borba-pr',       -24.3245, -50.6176,   80330),
  ('Arapongas',            'PR', 'arapongas-pr',            -23.4152, -51.4259,  125842),
  ('Cornélio Procópio',    'PR', 'cornelio-procopio-pr',    -23.1810, -50.6469,   47845),
  ('São José dos Pinhais', 'PR', 'sao-jose-dos-pinhais-pr', -25.5313, -49.2031,  329058),
  ('Colombo',              'PR', 'colombo-pr',              -25.2925, -49.2262,  233862),
  ('Araucária',            'PR', 'araucaria-pr',            -25.5929, -49.4100,  148431),
  ('Castro',               'PR', 'castro-pr',               -24.7911, -50.0119,   67084),
  ('Cianorte',             'PR', 'cianorte-pr',             -23.6633, -52.6050,   83816),
  ('Rolândia',             'PR', 'rolandia-pr',             -23.3100, -51.3692,   67383),
  ('Palmas',               'PR', 'palmas-pr',               -26.4840, -51.9906,   51560),
  -- São Paulo
  ('São Paulo',              'SP', 'sao-paulo-sp',              -23.5505, -46.6333, 11451999),
  ('Campinas',               'SP', 'campinas-sp',               -22.9056, -47.0608,  1139047),
  ('Santos',                 'SP', 'santos-sp',                 -23.9608, -46.3336,   418608),
  ('Sorocaba',               'SP', 'sorocaba-sp',               -23.5015, -47.4526,   723574),
  ('Ribeirão Preto',         'SP', 'ribeirao-preto-sp',         -21.1704, -47.8103,   698642),
  ('São José dos Campos',    'SP', 'sao-jose-dos-campos-sp',    -23.1896, -45.8841,   697428),
  ('São José do Rio Preto',  'SP', 'sao-jose-do-rio-preto-sp',  -20.8113, -49.3758,   480393),
  ('Bauru',                  'SP', 'bauru-sp',                  -22.3147, -49.0608,   379146),
  ('Piracicaba',             'SP', 'piracicaba-sp',             -22.7253, -47.6492,   423323),
  ('Jundiaí',                'SP', 'jundiai-sp',                -23.1857, -46.8978,   443221),
  ('Taubaté',                'SP', 'taubate-sp',                -23.0205, -45.5560,   310739),
  ('Presidente Prudente',    'SP', 'presidente-prudente-sp',    -22.1256, -51.3895,   225668),
  ('Araraquara',             'SP', 'araraquara-sp',             -21.7845, -48.1780,   242068),
  ('São Carlos',             'SP', 'sao-carlos-sp',             -22.0174, -47.8908,   254857),
  ('Marília',                'SP', 'marilia-sp',                -22.2171, -49.9501,   237130),
  ('Franca',                 'SP', 'franca-sp',                 -20.5386, -47.4008,   352536),
  ('Limeira',                'SP', 'limeira-sp',                -22.5641, -47.4014,   275827),
  ('Americana',              'SP', 'americana-sp',              -22.7374, -47.3331,   237112),
  ('Guarulhos',              'SP', 'guarulhos-sp',              -23.4538, -46.5333,  1291771),
  ('Santo André',            'SP', 'santo-andre-sp',            -23.6639, -46.5383,   748919),
  ('São Bernardo do Campo',  'SP', 'sao-bernardo-do-campo-sp',  -23.6914, -46.5646,   810729),
  ('Osasco',                 'SP', 'osasco-sp',                 -23.5329, -46.7918,   728615),
  ('Mogi das Cruzes',        'SP', 'mogi-das-cruzes-sp',        -23.5208, -46.1854,   451503),
  ('Botucatu',               'SP', 'botucatu-sp',               -22.8858, -48.4450,   148130),
  ('Registro',               'SP', 'registro-sp',               -24.4877, -47.8437,    56250),
  ('Itapetininga',           'SP', 'itapetininga-sp',           -23.5917, -48.0530,   157790),
  ('Assis',                  'SP', 'assis-sp',                  -22.6619, -50.4121,   105087),
  ('Ourinhos',               'SP', 'ourinhos-sp',               -22.9797, -49.8697,   107130),
  ('Barretos',               'SP', 'barretos-sp',               -20.5531, -48.5698,   118289),
  ('Jaú',                    'SP', 'jau-sp',                    -22.2936, -48.5592,   148147),
  ('Araçatuba',              'SP', 'aracatuba-sp',              -21.2089, -50.4328,   198129),
  ('Rio Claro',              'SP', 'rio-claro-sp',              -22.4109, -47.5608,   199310),
  ('Indaiatuba',             'SP', 'indaiatuba-sp',             -23.0903, -47.2181,   256223),
  ('Itu',                    'SP', 'itu-sp',                    -23.2640, -47.2992,   175568),
  ('Atibaia',                'SP', 'atibaia-sp',                -23.1171, -46.5563,   160209),
  ('Bragança Paulista',      'SP', 'braganca-paulista-sp',      -22.9527, -46.5419,   178209),
  ('Caraguatatuba',          'SP', 'caraguatatuba-sp',          -23.6200, -45.4130,   134306),
  ('Ubatuba',                'SP', 'ubatuba-sp',                -23.4340, -45.0710,    92819)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Casas de show (FICTÍCIAS)
-- show_days: 0 = domingo … 6 = sábado. Contatos falsos (99999-xxxx, @exemplo.com.br).
-- ---------------------------------------------------------------------------
insert into public.venues (
  city_id, name, slug, address, lat, lng, capacity, genres, show_days, deal_types,
  has_pa, has_backline, accepts_touring_bands,
  contact_name, contact_phone, contact_email, instagram, notes, status
) values
  -- Santa Catarina
  ((select id from public.cities where slug = 'joinville-sc'), 'Porão 77', 'porao-77',
   'Rua Visconde de Taunay, 77 — Centro', -26.3012, -48.8451, 220,
   '{punk,hardcore,rock}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Rafael (produção)', '+55 47 99999-0101', 'porao-77@exemplo.com.br', '@porao-77',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'joinville-sc'), 'Garagem Sônica', 'garagem-sonica',
   'Rua Blumenau, 1240 — América', -26.2921, -48.8612, 350,
   '{rock,indie,alternativo,garage}'::text[], '{4,5,6}'::smallint[], '{cache_fixo,bilheteria}'::public.deal_type[],
   true, true, true,
   'Camila (booking)', '+55 47 99999-0102', 'garagem-sonica@exemplo.com.br', '@garagem-sonica',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'florianopolis-sc'), 'Casa Ruído', 'casa-ruido',
   'Rua Felipe Schmidt, 410 — Centro', -27.5969, -48.5512, 180,
   '{indie,post-punk,alternativo,emo}'::text[], '{5,6,0}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Bruna (programação)', '+55 48 99999-0103', 'casa-ruido@exemplo.com.br', '@casa-ruido',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'florianopolis-sc'), 'Submarino Bar', 'submarino-bar',
   'Rua Lauro Linhares, 820 — Trindade', -27.5880, -48.5290, 150,
   '{punk,hardcore,crossover}'::text[], '{4,5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   false, false, true,
   'Tiago (dono)', '+55 48 99999-0104', 'submarino-bar@exemplo.com.br', '@submarino-bar',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'florianopolis-sc'), 'Estaleiro Rock Club', 'estaleiro-rock-club',
   'Rua Almirante Lamego, 1350 — Centro', -27.5790, -48.5330, 650,
   '{rock,metal,stoner,grunge}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Marcelo (produção)', '+55 48 99999-0105', 'estaleiro-rock-club@exemplo.com.br', '@estaleiro-rock-club',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'blumenau-sc'), 'Fábrica Oito', 'fabrica-oito',
   'Rua Itajaí, 808 — Vorstadt', -26.9150, -49.0590, 400,
   '{metal,metalcore,hardcore}'::text[], '{5,6}'::smallint[], '{bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Fernanda (booking)', '+55 47 99999-0106', 'fabrica-oito@exemplo.com.br', '@fabrica-oito',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'blumenau-sc'), 'Vale do Barulho', 'vale-do-barulho',
   'Rua Amazonas, 1515 — Garcia', -26.9330, -49.0750, 160,
   '{punk,garage,rock}'::text[], '{6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Diego (coletivo)', '+55 47 99999-0107', 'vale-do-barulho@exemplo.com.br', '@vale-do-barulho',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'itajai-sc'), 'Armazém do Cais', 'armazem-do-cais',
   'Rua Lauro Müller, 95 — Centro', -26.9040, -48.6560, 300,
   '{rock,ska,alternativo,indie}'::text[], '{5,6}'::smallint[], '{cache_fixo,porta}'::public.deal_type[],
   true, false, true,
   'Patrícia (produção)', '+55 47 99999-0108', 'armazem-do-cais@exemplo.com.br', '@armazem-do-cais',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'balneario-camboriu-sc'), 'Bunker 101', 'bunker-101',
   'Rua 1500, 101 — Centro', -26.9950, -48.6400, 250,
   '{metal,hardcore,metalcore}'::text[], '{5,6}'::smallint[], '{bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Gustavo (booking)', '+55 47 99999-0109', 'bunker-101@exemplo.com.br', '@bunker-101',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'chapeco-sc'), 'Oeste Underground', 'oeste-underground',
   'Avenida Getúlio Vargas, 2020 S — Centro', -27.0960, -52.6180, 200,
   '{rock,punk,metal,hardcore}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Leandro (produção)', '+55 49 99999-0110', 'oeste-underground@exemplo.com.br', '@oeste-underground',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'criciuma-sc'), 'Mina Sonora', 'mina-sonora',
   'Rua Henrique Lage, 333 — Centro', -28.6810, -49.3650, 280,
   '{metal,stoner,grunge,hardcore}'::text[], '{5,6}'::smallint[], '{bilheteria,porta}'::public.deal_type[],
   true, true, true,
   'Aline (dona)', '+55 48 99999-0111', 'mina-sonora@exemplo.com.br', '@mina-sonora',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'lages-sc'), 'Serra Alta Pub', 'serra-alta-pub',
   'Rua Coronel Córdova, 450 — Centro', -27.8120, -50.3300, 150,
   '{rock,stoner,alternativo}'::text[], '{5,6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Rodrigo (dono)', '+55 49 99999-0112', 'serra-alta-pub@exemplo.com.br', '@serra-alta-pub',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'jaragua-do-sul-sc'), 'Galpão Treze', 'galpao-treze',
   'Rua Walter Marquardt, 1313 — Barra do Rio Molha', -26.4790, -49.0820, 320,
   '{punk,hardcore,metal,crossover}'::text[], '{6}'::smallint[], '{cache_fixo,misto}'::public.deal_type[],
   true, true, true,
   'Vanessa (produção)', '+55 47 99999-0113', 'galpao-treze@exemplo.com.br', '@galpao-treze',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'tubarao-sc'), 'Dique Seco', 'dique-seco',
   'Avenida Marcolino Martins Cabral, 980 — Centro', -28.4760, -49.0100, 120,
   '{punk,rock,garage}'::text[], '{}'::smallint[], '{porta}'::public.deal_type[],
   false, false, true,
   'Everton (coletivo)', '+55 48 99999-0114', 'dique-seco@exemplo.com.br', '@dique-seco',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  -- Paraná
  ((select id from public.cities where slug = 'curitiba-pr'), 'Caverna 92', 'caverna-92',
   'Rua Trajano Reis, 92 — São Francisco', -25.4250, -49.2760, 200,
   '{punk,hardcore,crossover,ska}'::text[], '{4,5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Paulo (produção)', '+55 41 99999-0115', 'caverna-92@exemplo.com.br', '@caverna-92',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'curitiba-pr'), 'Sala Preta', 'sala-preta',
   'Avenida Sete de Setembro, 4100 — Batel', -25.4400, -49.2880, 500,
   '{metal,metalcore,stoner}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria}'::public.deal_type[],
   true, true, true,
   'Renata (booking)', '+55 41 99999-0116', 'sala-preta@exemplo.com.br', '@sala-preta',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'curitiba-pr'), 'Ferrugem Bar', 'ferrugem-bar',
   'Rua Itupava, 1270 — Alto da XV', -25.4210, -49.2560, 130,
   '{garage,punk,post-punk,indie}'::text[], '{4,5,6,0}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Júlio (dono)', '+55 41 99999-0117', 'ferrugem-bar@exemplo.com.br', '@ferrugem-bar',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'curitiba-pr'), 'Hangar Boqueirão', 'hangar-boqueirao',
   'Avenida Marechal Floriano Peixoto, 3200 — Rebouças', -25.4460, -49.2600, 780,
   '{metal,hardcore,metalcore,crossover}'::text[], '{6}'::smallint[], '{bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Sandra (produção)', '+55 41 99999-0118', 'hangar-boqueirao@exemplo.com.br', '@hangar-boqueirao',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'londrina-pr'), 'Clube Concreto', 'clube-concreto',
   'Rua Sergipe, 1350 — Centro', -23.3090, -51.1640, 450,
   '{rock,indie,alternativo,emo}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Henrique (booking)', '+55 43 99999-0119', 'clube-concreto@exemplo.com.br', '@clube-concreto',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'londrina-pr'), 'Cabaré Elétrico', 'cabare-eletrico',
   'Rua Pernambuco, 580 — Centro', -23.3010, -51.1750, 170,
   '{punk,garage,ska,rock}'::text[], '{4,5,6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Luana (programação)', '+55 43 99999-0120', 'cabare-eletrico@exemplo.com.br', '@cabare-eletrico',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'maringa-pr'), 'Toca do Lobo', 'toca-do-lobo',
   'Avenida Brasil, 2550 — Zona 01', -23.4230, -51.9380, 300,
   '{rock,metal,stoner,grunge}'::text[], '{5,6}'::smallint[], '{bilheteria,porta}'::public.deal_type[],
   true, true, true,
   'Fábio (dono)', '+55 44 99999-0121', 'toca-do-lobo@exemplo.com.br', '@toca-do-lobo',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'maringa-pr'), 'Ipê Negro', 'ipe-negro',
   'Rua Santos Dumont, 1720 — Zona 03', -23.4120, -51.9250, 140,
   '{indie,emo,post-punk,alternativo}'::text[], '{5,6,0}'::smallint[], '{porta}'::public.deal_type[],
   true, false, false,
   'Carolina (coletivo)', '+55 44 99999-0122', 'ipe-negro@exemplo.com.br', '@ipe-negro',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'ponta-grossa-pr'), 'Estação Distorção', 'estacao-distorcao',
   'Rua Balduíno Taques, 620 — Centro', -25.0950, -50.1620, 250,
   '{punk,hardcore,metal,crossover}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, true, true,
   'Maurício (produção)', '+55 42 99999-0123', 'estacao-distorcao@exemplo.com.br', '@estacao-distorcao',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'cascavel-pr'), 'Cobra Coral Rock Bar', 'cobra-coral-rock-bar',
   'Rua Paraná, 3100 — Centro', -24.9520, -53.4600, 220,
   '{rock,metal,hardcore}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Simone (dona)', '+55 45 99999-0124', 'cobra-coral-rock-bar@exemplo.com.br', '@cobra-coral-rock-bar',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'foz-do-iguacu-pr'), 'Fronteira Sonora', 'fronteira-sonora',
   'Avenida Jorge Schimmelpfeng, 450 — Centro', -25.5440, -54.5850, 350,
   '{rock,metal,punk,alternativo}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria}'::public.deal_type[],
   true, true, true,
   'Nilson (booking)', '+55 45 99999-0125', 'fronteira-sonora@exemplo.com.br', '@fronteira-sonora',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'guarapuava-pr'), 'Pinheiral Pub', 'pinheiral-pub',
   'Rua XV de Novembro, 7700 — Centro', -25.3870, -51.4590, 180,
   '{rock,stoner,metal}'::text[], '{5,6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Cristiane (dona)', '+55 42 99999-0126', 'pinheiral-pub@exemplo.com.br', '@pinheiral-pub',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'paranagua-pr'), 'Molhe Rock Bar', 'molhe-rock-bar',
   'Rua Faria Sobrinho, 210 — Centro Histórico', -25.5160, -48.5120, 110,
   '{punk,ska,rock,garage}'::text[], '{}'::smallint[], '{porta}'::public.deal_type[],
   false, false, true,
   'Anderson (coletivo)', '+55 41 99999-0127', 'molhe-rock-bar@exemplo.com.br', '@molhe-rock-bar',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'pato-branco-pr'), 'Oficina 46', 'oficina-46',
   'Rua Tapajós, 460 — Centro', -26.2270, -52.6740, 160,
   '{hardcore,punk,metal}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Tatiane (produção)', '+55 46 99999-0128', 'oficina-46@exemplo.com.br', '@oficina-46',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  -- São Paulo
  ((select id from public.cities where slug = 'sao-paulo-sp'), 'Subsolo Augusta', 'subsolo-augusta',
   'Rua Augusta, 1180 — Consolação', -23.5540, -46.6490, 300,
   '{punk,hardcore,garage,post-punk}'::text[], '{4,5,6,0}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, true, true,
   'Letícia (programação)', '+55 11 99999-0129', 'subsolo-augusta@exemplo.com.br', '@subsolo-augusta',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sao-paulo-sp'), 'Galpão Mooca', 'galpao-mooca',
   'Rua Borges de Figueiredo, 560 — Mooca', -23.5560, -46.6180, 800,
   '{metal,hardcore,metalcore,crossover}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Roberto (produção)', '+55 11 99999-0130', 'galpao-mooca@exemplo.com.br', '@galpao-mooca',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sao-paulo-sp'), 'Barra Pesada Club', 'barra-pesada-club',
   'Rua da Consolação, 2200 — Consolação', -23.5610, -46.6500, 450,
   '{metal,stoner,grunge,psicodelico}'::text[], '{5,6}'::smallint[], '{bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Beatriz (booking)', '+55 11 99999-0131', 'barra-pesada-club@exemplo.com.br', '@barra-pesada-club',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sao-paulo-sp'), 'Toca da Lapa', 'toca-da-lapa',
   'Rua Barra Funda, 1050 — Barra Funda', -23.5340, -46.6520, 180,
   '{indie,emo,alternativo,post-punk}'::text[], '{4,5,6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Caio (coletivo)', '+55 11 99999-0132', 'toca-da-lapa@exemplo.com.br', '@toca-da-lapa',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'campinas-sp'), 'Casa Taquaral', 'casa-taquaral',
   'Rua Barão de Itapura, 1800 — Taquaral', -22.8960, -47.0540, 350,
   '{rock,indie,alternativo,stoner}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria}'::public.deal_type[],
   true, true, true,
   'Daniela (booking)', '+55 19 99999-0133', 'casa-taquaral@exemplo.com.br', '@casa-taquaral',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'campinas-sp'), 'Bunker Barão', 'bunker-barao',
   'Avenida Francisco Glicério, 1200 — Centro', -22.9020, -47.0640, 200,
   '{punk,hardcore,metal,crossover}'::text[], '{4,5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Felipe (produção)', '+55 19 99999-0134', 'bunker-barao@exemplo.com.br', '@bunker-barao',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'santos-sp'), 'Cais 13', 'cais-13',
   'Rua XV de Novembro, 130 — Centro', -23.9500, -46.3300, 220,
   '{punk,ska,hardcore,rock}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, false, true,
   'Marina (produção)', '+55 13 99999-0135', 'cais-13@exemplo.com.br', '@cais-13',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sorocaba-sp'), 'Trilho Torto', 'trilho-torto',
   'Rua Doutor Álvaro Soares, 800 — Centro', -23.5050, -47.4580, 260,
   '{rock,metal,stoner,grunge}'::text[], '{5,6}'::smallint[], '{bilheteria,porta}'::public.deal_type[],
   true, true, true,
   'Wagner (dono)', '+55 15 99999-0136', 'trilho-torto@exemplo.com.br', '@trilho-torto',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'ribeirao-preto-sp'), 'Cervejaria Fantasma', 'cervejaria-fantasma',
   'Rua General Osório, 990 — Centro', -21.1760, -47.8150, 380,
   '{rock,indie,alternativo,psicodelico}'::text[], '{4,5,6}'::smallint[], '{cache_fixo,misto}'::public.deal_type[],
   true, true, true,
   'Priscila (booking)', '+55 16 99999-0137', 'cervejaria-fantasma@exemplo.com.br', '@cervejaria-fantasma',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sao-jose-dos-campos-sp'), 'Vale Steel', 'vale-steel',
   'Rua Sebastião Humel, 310 — Centro', -23.1850, -45.8900, 320,
   '{hardcore,metalcore,metal,emo}'::text[], '{5,6}'::smallint[], '{bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Ricardo (produção)', '+55 12 99999-0138', 'vale-steel@exemplo.com.br', '@vale-steel',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'sao-jose-do-rio-preto-sp'), 'Bodega Rock', 'bodega-rock',
   'Rua Bernardino de Campos, 2900 — Centro', -20.8160, -49.3800, 190,
   '{rock,punk,garage,alternativo}'::text[], '{5,6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Eduardo (dono)', '+55 17 99999-0139', 'bodega-rock@exemplo.com.br', '@bodega-rock',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'bauru-sp'), 'Garagem Central', 'garagem-central',
   'Rua Batista de Carvalho, 450 — Centro', -22.3180, -49.0650, 240,
   '{rock,metal,hardcore,stoner}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, true, true,
   'Natália (programação)', '+55 14 99999-0140', 'garagem-central@exemplo.com.br', '@garagem-central',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'piracicaba-sp'), 'Barranco Bar', 'barranco-bar',
   'Rua do Porto, 1200 — Centro', -22.7210, -47.6530, 150,
   '{indie,rock,grunge,alternativo}'::text[], '{5,6,0}'::smallint[], '{porta}'::public.deal_type[],
   true, false, false,
   'Otávio (coletivo)', '+55 19 99999-0141', 'barranco-bar@exemplo.com.br', '@barranco-bar',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'jundiai-sp'), 'Casa Japi', 'casa-japi',
   'Rua Barão de Jundiaí, 700 — Centro', -23.1890, -46.8910, 200,
   '{rock,stoner,psicodelico,indie}'::text[], '{5,6}'::smallint[], '{porta,misto}'::public.deal_type[],
   true, true, true,
   'Helena (booking)', '+55 11 99999-0142', 'casa-japi@exemplo.com.br', '@casa-japi',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'santo-andre-sp'), 'Fábrica ABC', 'fabrica-abc',
   'Rua Senador Fláquer, 1250 — Centro', -23.6600, -46.5340, 600,
   '{punk,hardcore,metal,crossover}'::text[], '{5,6}'::smallint[], '{cache_fixo,bilheteria,misto}'::public.deal_type[],
   true, true, true,
   'Jorge (produção)', '+55 11 99999-0143', 'fabrica-abc@exemplo.com.br', '@fabrica-abc',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'presidente-prudente-sp'), 'Último Trem', 'ultimo-trem',
   'Rua Siqueira Campos, 200 — Centro', -22.1230, -51.3930, 140,
   '{rock,punk,alternativo}'::text[], '{6}'::smallint[], '{porta}'::public.deal_type[],
   true, false, true,
   'Isabela (dona)', '+55 18 99999-0144', 'ultimo-trem@exemplo.com.br', '@ultimo-trem',
   'Dado de exemplo — substitua por uma casa real.', 'verified'),

  ((select id from public.cities where slug = 'marilia-sp'), 'Quintal Hardcore', 'quintal-hardcore',
   'Avenida Sampaio Vidal, 1500 — Centro', -22.2130, -49.9460, 100,
   '{hardcore,punk,metalcore}'::text[], '{}'::smallint[], '{porta}'::public.deal_type[],
   false, false, true,
   'Vinícius (coletivo)', '+55 14 99999-0145', 'quintal-hardcore@exemplo.com.br', '@quintal-hardcore',
   'Dado de exemplo — substitua por uma casa real.', 'verified')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Produtoras (FICTÍCIAS)
-- ---------------------------------------------------------------------------
insert into public.producers (
  name, slug, city_id, genres, contact_name, contact_phone, contact_email, instagram, notes, status
) values
  ('Coletivo Barulho Norte', 'coletivo-barulho-norte',
   (select id from public.cities where slug = 'joinville-sc'),
   '{punk,hardcore,rock}'::text[],
   'Rafael (produção)', '+55 47 99999-0201', 'coletivo-barulho-norte@exemplo.com.br', '@coletivo-barulho-norte',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Ilha Sonora Produções', 'ilha-sonora-producoes',
   (select id from public.cities where slug = 'florianopolis-sc'),
   '{indie,alternativo,rock,post-punk}'::text[],
   'Bruna (booking)', '+55 48 99999-0202', 'ilha-sonora-producoes@exemplo.com.br', '@ilha-sonora-producoes',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Vale Produções Independentes', 'vale-producoes-independentes',
   (select id from public.cities where slug = 'blumenau-sc'),
   '{metal,metalcore,hardcore}'::text[],
   'Fernanda (produção)', '+55 47 99999-0203', 'vale-producoes-independentes@exemplo.com.br', '@vale-producoes-independentes',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Sul Profundo Booking', 'sul-profundo-booking',
   (select id from public.cities where slug = 'criciuma-sc'),
   '{metal,stoner,grunge}'::text[],
   'Aline (booking)', '+55 48 99999-0204', 'sul-profundo-booking@exemplo.com.br', '@sul-profundo-booking',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Oeste Catarinense Shows', 'oeste-catarinense-shows',
   (select id from public.cities where slug = 'chapeco-sc'),
   '{rock,punk,crossover}'::text[],
   'Leandro (produção)', '+55 49 99999-0205', 'oeste-catarinense-shows@exemplo.com.br', '@oeste-catarinense-shows',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Pinhão Punk Produções', 'pinhao-punk-producoes',
   (select id from public.cities where slug = 'curitiba-pr'),
   '{punk,hardcore,crossover,ska}'::text[],
   'Paulo (produção)', '+55 41 99999-0206', 'pinhao-punk-producoes@exemplo.com.br', '@pinhao-punk-producoes',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Araucária Metal Crew', 'araucaria-metal-crew',
   (select id from public.cities where slug = 'curitiba-pr'),
   '{metal,metalcore,stoner}'::text[],
   'Renata (booking)', '+55 41 99999-0207', 'araucaria-metal-crew@exemplo.com.br', '@araucaria-metal-crew',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Norte Pioneiro Shows', 'norte-pioneiro-shows',
   (select id from public.cities where slug = 'londrina-pr'),
   '{rock,indie,emo,alternativo}'::text[],
   'Henrique (produção)', '+55 43 99999-0208', 'norte-pioneiro-shows@exemplo.com.br', '@norte-pioneiro-shows',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Fronteira Oeste Produções', 'fronteira-oeste-producoes',
   (select id from public.cities where slug = 'cascavel-pr'),
   '{rock,metal,hardcore}'::text[],
   'Simone (booking)', '+55 45 99999-0209', 'fronteira-oeste-producoes@exemplo.com.br', '@fronteira-oeste-producoes',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Baixo Augusta Coletivo', 'baixo-augusta-coletivo',
   (select id from public.cities where slug = 'sao-paulo-sp'),
   '{punk,hardcore,garage,post-punk}'::text[],
   'Letícia (produção)', '+55 11 99999-0210', 'baixo-augusta-coletivo@exemplo.com.br', '@baixo-augusta-coletivo',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Interior Pesado Produções', 'interior-pesado-producoes',
   (select id from public.cities where slug = 'campinas-sp'),
   '{metal,stoner,psicodelico,grunge}'::text[],
   'Daniela (booking)', '+55 19 99999-0211', 'interior-pesado-producoes@exemplo.com.br', '@interior-pesado-producoes',
   'Dado de exemplo — substitua por uma produtora real.', 'verified'),

  ('Vale do Paraíba Hardcore', 'vale-do-paraiba-hardcore',
   (select id from public.cities where slug = 'sao-jose-dos-campos-sp'),
   '{hardcore,metalcore,emo}'::text[],
   'Ricardo (produção)', '+55 12 99999-0212', 'vale-do-paraiba-hardcore@exemplo.com.br', '@vale-do-paraiba-hardcore',
   'Dado de exemplo — substitua por uma produtora real.', 'verified')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Produtoras x cidades onde atuam
-- ---------------------------------------------------------------------------
insert into public.producer_cities (producer_id, city_id) values
  -- Coletivo Barulho Norte
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.cities where slug = 'joinville-sc')),
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.cities where slug = 'jaragua-do-sul-sc')),
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.cities where slug = 'blumenau-sc')),
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.cities where slug = 'itajai-sc')),
  -- Ilha Sonora Produções
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.cities where slug = 'florianopolis-sc')),
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.cities where slug = 'sao-jose-sc')),
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.cities where slug = 'palhoca-sc')),
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.cities where slug = 'itajai-sc')),
  -- Vale Produções Independentes
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.cities where slug = 'blumenau-sc')),
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.cities where slug = 'brusque-sc')),
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.cities where slug = 'rio-do-sul-sc')),
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.cities where slug = 'indaial-sc')),
  -- Sul Profundo Booking
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.cities where slug = 'criciuma-sc')),
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.cities where slug = 'tubarao-sc')),
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.cities where slug = 'ararangua-sc')),
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.cities where slug = 'icara-sc')),
  -- Oeste Catarinense Shows
  ((select id from public.producers where slug = 'oeste-catarinense-shows'), (select id from public.cities where slug = 'chapeco-sc')),
  ((select id from public.producers where slug = 'oeste-catarinense-shows'), (select id from public.cities where slug = 'xanxere-sc')),
  ((select id from public.producers where slug = 'oeste-catarinense-shows'), (select id from public.cities where slug = 'concordia-sc')),
  -- Pinhão Punk Produções
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.cities where slug = 'curitiba-pr')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.cities where slug = 'sao-jose-dos-pinhais-pr')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.cities where slug = 'ponta-grossa-pr')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.cities where slug = 'paranagua-pr')),
  -- Araucária Metal Crew
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.cities where slug = 'curitiba-pr')),
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.cities where slug = 'colombo-pr')),
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.cities where slug = 'araucaria-pr')),
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.cities where slug = 'guarapuava-pr')),
  -- Norte Pioneiro Shows
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.cities where slug = 'londrina-pr')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.cities where slug = 'arapongas-pr')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.cities where slug = 'apucarana-pr')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.cities where slug = 'maringa-pr')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.cities where slug = 'rolandia-pr')),
  -- Fronteira Oeste Produções
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.cities where slug = 'cascavel-pr')),
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.cities where slug = 'toledo-pr')),
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.cities where slug = 'foz-do-iguacu-pr')),
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.cities where slug = 'pato-branco-pr')),
  -- Baixo Augusta Coletivo
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.cities where slug = 'sao-paulo-sp')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.cities where slug = 'santo-andre-sp')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.cities where slug = 'guarulhos-sp')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.cities where slug = 'osasco-sp')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.cities where slug = 'sao-bernardo-do-campo-sp')),
  -- Interior Pesado Produções
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.cities where slug = 'campinas-sp')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.cities where slug = 'americana-sp')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.cities where slug = 'limeira-sp')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.cities where slug = 'piracicaba-sp')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.cities where slug = 'jundiai-sp')),
  -- Vale do Paraíba Hardcore
  ((select id from public.producers where slug = 'vale-do-paraiba-hardcore'), (select id from public.cities where slug = 'sao-jose-dos-campos-sp')),
  ((select id from public.producers where slug = 'vale-do-paraiba-hardcore'), (select id from public.cities where slug = 'taubate-sp')),
  ((select id from public.producers where slug = 'vale-do-paraiba-hardcore'), (select id from public.cities where slug = 'caraguatatuba-sp')),
  ((select id from public.producers where slug = 'vale-do-paraiba-hardcore'), (select id from public.cities where slug = 'mogi-das-cruzes-sp'))
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Produtoras x casas com que trabalham (sempre em cidades onde a produtora atua)
-- ---------------------------------------------------------------------------
insert into public.producer_venues (producer_id, venue_id) values
  -- Coletivo Barulho Norte
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.venues where slug = 'porao-77')),
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.venues where slug = 'garagem-sonica')),
  ((select id from public.producers where slug = 'coletivo-barulho-norte'), (select id from public.venues where slug = 'galpao-treze')),
  -- Ilha Sonora Produções
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.venues where slug = 'casa-ruido')),
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.venues where slug = 'submarino-bar')),
  ((select id from public.producers where slug = 'ilha-sonora-producoes'), (select id from public.venues where slug = 'armazem-do-cais')),
  -- Vale Produções Independentes
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.venues where slug = 'fabrica-oito')),
  ((select id from public.producers where slug = 'vale-producoes-independentes'), (select id from public.venues where slug = 'vale-do-barulho')),
  -- Sul Profundo Booking
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.venues where slug = 'mina-sonora')),
  ((select id from public.producers where slug = 'sul-profundo-booking'), (select id from public.venues where slug = 'dique-seco')),
  -- Oeste Catarinense Shows
  ((select id from public.producers where slug = 'oeste-catarinense-shows'), (select id from public.venues where slug = 'oeste-underground')),
  -- Pinhão Punk Produções
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.venues where slug = 'caverna-92')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.venues where slug = 'ferrugem-bar')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.venues where slug = 'estacao-distorcao')),
  ((select id from public.producers where slug = 'pinhao-punk-producoes'), (select id from public.venues where slug = 'molhe-rock-bar')),
  -- Araucária Metal Crew
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.venues where slug = 'sala-preta')),
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.venues where slug = 'hangar-boqueirao')),
  ((select id from public.producers where slug = 'araucaria-metal-crew'), (select id from public.venues where slug = 'pinheiral-pub')),
  -- Norte Pioneiro Shows
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.venues where slug = 'clube-concreto')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.venues where slug = 'cabare-eletrico')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.venues where slug = 'toca-do-lobo')),
  ((select id from public.producers where slug = 'norte-pioneiro-shows'), (select id from public.venues where slug = 'ipe-negro')),
  -- Fronteira Oeste Produções
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.venues where slug = 'cobra-coral-rock-bar')),
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.venues where slug = 'fronteira-sonora')),
  ((select id from public.producers where slug = 'fronteira-oeste-producoes'), (select id from public.venues where slug = 'oficina-46')),
  -- Baixo Augusta Coletivo
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.venues where slug = 'subsolo-augusta')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.venues where slug = 'toca-da-lapa')),
  ((select id from public.producers where slug = 'baixo-augusta-coletivo'), (select id from public.venues where slug = 'fabrica-abc')),
  -- Interior Pesado Produções
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.venues where slug = 'casa-taquaral')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.venues where slug = 'bunker-barao')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.venues where slug = 'barranco-bar')),
  ((select id from public.producers where slug = 'interior-pesado-producoes'), (select id from public.venues where slug = 'casa-japi')),
  -- Vale do Paraíba Hardcore
  ((select id from public.producers where slug = 'vale-do-paraiba-hardcore'), (select id from public.venues where slug = 'vale-steel'))
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Bandas locais (FICTÍCIAS)
-- ---------------------------------------------------------------------------
insert into public.bands (
  name, slug, city_id, genres, links, contact_name, contact_phone, contact_email,
  opens_for_touring, notes, status
) values
  ('Cão Raivoso', 'cao-raivoso', (select id from public.cities where slug = 'joinville-sc'),
   '{hardcore,punk}'::text[],
   '{"instagram": "https://instagram.com/cao-raivoso", "spotify": "https://open.spotify.com/artist/cao-raivoso", "bandcamp": "https://cao-raivoso.bandcamp.com"}'::jsonb,
   'Rafael (vocal)', '+55 47 99999-0301', 'cao-raivoso@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Maré Baixa', 'mare-baixa', (select id from public.cities where slug = 'florianopolis-sc'),
   '{indie,alternativo}'::text[],
   '{"instagram": "https://instagram.com/mare-baixa", "spotify": "https://open.spotify.com/artist/mare-baixa"}'::jsonb,
   'Ana (baixo)', '+55 48 99999-0302', 'mare-baixa@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Enxofre', 'enxofre', (select id from public.cities where slug = 'blumenau-sc'),
   '{metal,stoner}'::text[],
   '{"instagram": "https://instagram.com/enxofre", "spotify": "https://open.spotify.com/artist/enxofre", "youtube": "https://youtube.com/@enxofre"}'::jsonb,
   'Marcos (guitarra)', '+55 47 99999-0303', 'enxofre@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Última Linha', 'ultima-linha', (select id from public.cities where slug = 'curitiba-pr'),
   '{punk,hardcore}'::text[],
   '{"instagram": "https://instagram.com/ultima-linha", "spotify": "https://open.spotify.com/artist/ultima-linha", "bandcamp": "https://ultima-linha.bandcamp.com"}'::jsonb,
   'Pedro (vocal)', '+55 41 99999-0304', 'ultima-linha@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Névoa Cinza', 'nevoa-cinza', (select id from public.cities where slug = 'curitiba-pr'),
   '{post-punk,indie}'::text[],
   '{"instagram": "https://instagram.com/nevoa-cinza", "spotify": "https://open.spotify.com/artist/nevoa-cinza"}'::jsonb,
   'Lívia (voz e synth)', '+55 41 99999-0305', 'nevoa-cinza@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Serra Pelada', 'serra-pelada', (select id from public.cities where slug = 'lages-sc'),
   '{stoner,grunge}'::text[],
   '{"instagram": "https://instagram.com/serra-pelada", "spotify": "https://open.spotify.com/artist/serra-pelada"}'::jsonb,
   'João (bateria)', '+55 49 99999-0306', 'serra-pelada@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Fio Terra', 'fio-terra', (select id from public.cities where slug = 'londrina-pr'),
   '{rock,garage}'::text[],
   '{"instagram": "https://instagram.com/fio-terra", "spotify": "https://open.spotify.com/artist/fio-terra", "youtube": "https://youtube.com/@fio-terra"}'::jsonb,
   'Thiago (guitarra)', '+55 43 99999-0307', 'fio-terra@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Pedra Rolante', 'pedra-rolante', (select id from public.cities where slug = 'maringa-pr'),
   '{rock,alternativo}'::text[],
   '{"instagram": "https://instagram.com/pedra-rolante", "spotify": "https://open.spotify.com/artist/pedra-rolante"}'::jsonb,
   'Mariana (vocal)', '+55 44 99999-0308', 'pedra-rolante@exemplo.com.br',
   false, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Trator Negro', 'trator-negro', (select id from public.cities where slug = 'cascavel-pr'),
   '{metal,crossover}'::text[],
   '{"instagram": "https://instagram.com/trator-negro", "spotify": "https://open.spotify.com/artist/trator-negro", "bandcamp": "https://trator-negro.bandcamp.com"}'::jsonb,
   'Cleber (vocal)', '+55 45 99999-0309', 'trator-negro@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Galho Seco', 'galho-seco', (select id from public.cities where slug = 'chapeco-sc'),
   '{punk,rock}'::text[],
   '{"instagram": "https://instagram.com/galho-seco", "spotify": "https://open.spotify.com/artist/galho-seco"}'::jsonb,
   'Débora (baixo)', '+55 49 99999-0310', 'galho-seco@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Pavio Curto', 'pavio-curto', (select id from public.cities where slug = 'sao-paulo-sp'),
   '{hardcore,crossover}'::text[],
   '{"instagram": "https://instagram.com/pavio-curto", "spotify": "https://open.spotify.com/artist/pavio-curto", "bandcamp": "https://pavio-curto.bandcamp.com"}'::jsonb,
   'Lucas (vocal)', '+55 11 99999-0311', 'pavio-curto@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Rua de Baixo', 'rua-de-baixo', (select id from public.cities where slug = 'sao-paulo-sp'),
   '{ska,punk}'::text[],
   '{"instagram": "https://instagram.com/rua-de-baixo", "spotify": "https://open.spotify.com/artist/rua-de-baixo", "youtube": "https://youtube.com/@rua-de-baixo"}'::jsonb,
   'Carla (trompete)', '+55 11 99999-0312', 'rua-de-baixo@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Vidro Fosco', 'vidro-fosco', (select id from public.cities where slug = 'sao-paulo-sp'),
   '{emo,indie}'::text[],
   '{"instagram": "https://instagram.com/vidro-fosco", "spotify": "https://open.spotify.com/artist/vidro-fosco"}'::jsonb,
   'Gabriel (guitarra)', '+55 11 99999-0313', 'vidro-fosco@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Anestesia Geral', 'anestesia-geral', (select id from public.cities where slug = 'campinas-sp'),
   '{grunge,alternativo}'::text[],
   '{"instagram": "https://instagram.com/anestesia-geral", "spotify": "https://open.spotify.com/artist/anestesia-geral"}'::jsonb,
   'Renan (bateria)', '+55 19 99999-0314', 'anestesia-geral@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Caldeira Oito', 'caldeira-oito', (select id from public.cities where slug = 'santos-sp'),
   '{metal,metalcore}'::text[],
   '{"instagram": "https://instagram.com/caldeira-oito", "spotify": "https://open.spotify.com/artist/caldeira-oito", "youtube": "https://youtube.com/@caldeira-oito"}'::jsonb,
   'Fernando (vocal)', '+55 13 99999-0315', 'caldeira-oito@exemplo.com.br',
   false, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Quintal Azul', 'quintal-azul', (select id from public.cities where slug = 'ribeirao-preto-sp'),
   '{indie,psicodelico}'::text[],
   '{"instagram": "https://instagram.com/quintal-azul", "spotify": "https://open.spotify.com/artist/quintal-azul", "bandcamp": "https://quintal-azul.bandcamp.com"}'::jsonb,
   'Sofia (teclado)', '+55 16 99999-0316', 'quintal-azul@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Motor Velho', 'motor-velho', (select id from public.cities where slug = 'sorocaba-sp'),
   '{rock,stoner}'::text[],
   '{"instagram": "https://instagram.com/motor-velho", "spotify": "https://open.spotify.com/artist/motor-velho"}'::jsonb,
   'Alex (guitarra)', '+55 15 99999-0317', 'motor-velho@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Cabeça de Prego', 'cabeca-de-prego', (select id from public.cities where slug = 'criciuma-sc'),
   '{hardcore,metalcore}'::text[],
   '{"instagram": "https://instagram.com/cabeca-de-prego", "spotify": "https://open.spotify.com/artist/cabeca-de-prego"}'::jsonb,
   'Willian (vocal)', '+55 48 99999-0318', 'cabeca-de-prego@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Lanterna Vermelha', 'lanterna-vermelha', (select id from public.cities where slug = 'sao-jose-dos-campos-sp'),
   '{emo,post-punk}'::text[],
   '{"instagram": "https://instagram.com/lanterna-vermelha", "spotify": "https://open.spotify.com/artist/lanterna-vermelha", "bandcamp": "https://lanterna-vermelha.bandcamp.com"}'::jsonb,
   'Bianca (vocal)', '+55 12 99999-0319', 'lanterna-vermelha@exemplo.com.br',
   true, 'Dado de exemplo — substitua por uma banda real.', 'verified'),

  ('Ferro Velho Sonoro', 'ferro-velho-sonoro', (select id from public.cities where slug = 'ponta-grossa-pr'),
   '{garage,punk}'::text[],
   '{"instagram": "https://instagram.com/ferro-velho-sonoro", "spotify": "https://open.spotify.com/artist/ferro-velho-sonoro"}'::jsonb,
   'Igor (baixo)', '+55 42 99999-0320', 'ferro-velho-sonoro@exemplo.com.br',
   false, 'Dado de exemplo — substitua por uma banda real.', 'verified')
on conflict (slug) do nothing;

commit;
