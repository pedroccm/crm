-- =====================================================
-- GAIA CRM - DADOS DE EXEMPLO PARA PRIMEIRA CONFIGURAÇÃO
-- =====================================================
-- Este script insere dados falsos realistas para testar o sistema

-- =====================================================
-- 1. CRIAR TIME PRINCIPAL
-- =====================================================

INSERT INTO public.teams (id, name, slug, description, created_by) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Vendas Master',
  'vendas-master',
  'Equipe principal de vendas da empresa',
  NULL
);

-- =====================================================
-- 2. CRIAR EMPRESAS
-- =====================================================

INSERT INTO public.companies (id, name, email, phone, address, website, team_id, custom_fields) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  'Tech Inovações Ltda',
  'contato@techinovacoes.com.br',
  '(11) 3456-7890',
  'Av. Paulista, 1000 - São Paulo, SP',
  'https://techinovacoes.com.br',
  '11111111-1111-1111-1111-111111111111',
  '{"segmento": "Tecnologia", "funcionarios": "50-100", "faturamento": "R$ 5M-10M"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222223',
  'Construtora Silva & Filhos',
  'vendas@silvafilhos.com.br',
  '(11) 2345-6789',
  'Rua das Obras, 500 - São Paulo, SP',
  'https://silvafilhos.com.br',
  '11111111-1111-1111-1111-111111111111',
  '{"segmento": "Construção", "funcionarios": "100-500", "faturamento": "R$ 10M+"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222224',
  'Escola Futuro Brilhante',
  'diretoria@futurobrilhante.edu.br',
  '(11) 4567-8901',
  'Rua da Educação, 200 - São Paulo, SP',
  'https://futurobrilhante.edu.br',
  '11111111-1111-1111-1111-111111111111',
  '{"segmento": "Educação", "funcionarios": "20-50", "alunos": "500-1000"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222225',
  'Restaurante Sabor & Arte',
  'gerencia@saborarte.com.br',
  '(11) 5678-9012',
  'Av. Gourmet, 150 - São Paulo, SP',
  'https://saborarte.com.br',
  '11111111-1111-1111-1111-111111111111',
  '{"segmento": "Restaurante", "funcionarios": "10-20", "cobertura": "3 unidades"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222226',
  'Clínica Saúde Total',
  'atendimento@saudetotal.med.br',
  '(11) 6789-0123',
  'Rua da Saúde, 300 - São Paulo, SP',
  'https://saudetotal.med.br',
  '11111111-1111-1111-1111-111111111111',
  '{"segmento": "Saúde", "funcionarios": "30-50", "especialidades": "Cardiologia, Dermatologia"}'::jsonb
);

-- =====================================================
-- 3. CRIAR LEADS
-- =====================================================

INSERT INTO public.leads (id, name, email, phone, company_id, status, team_id, custom_fields) VALUES
(
  '33333333-3333-3333-3333-333333333333',
  'Carlos Mendes',
  'carlos.mendes@techinovacoes.com.br',
  '(11) 9876-5432',
  '22222222-2222-2222-2222-222222222222',
  'prospecto',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "CTO", "interesse": "Sistema de CRM", "orcamento": "R$ 50.000", "urgencia": "Alta"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333334',
  'Marina Silva',
  'marina.silva@silvafilhos.com.br',
  '(11) 8765-4321',
  '22222222-2222-2222-2222-222222222223',
  'qualificado',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "Gerente de Vendas", "interesse": "Automação de vendas", "orcamento": "R$ 30.000", "urgencia": "Média"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333335',
  'João Santos',
  'joao.santos@futurobrilhante.edu.br',
  '(11) 7654-3210',
  '22222222-2222-2222-2222-222222222224',
  'contato_inicial',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "Diretor", "interesse": "Sistema acadêmico", "orcamento": "R$ 20.000", "urgencia": "Baixa"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333336',
  'Ana Costa',
  'ana.costa@saborarte.com.br',
  '(11) 6543-2109',
  '22222222-2222-2222-2222-222222222225',
  'proposta',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "Proprietária", "interesse": "Sistema de pedidos", "orcamento": "R$ 15.000", "urgencia": "Alta"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333337',
  'Dr. Roberto Lima',
  'roberto.lima@saudetotal.med.br',
  '(11) 5432-1098',
  '22222222-2222-2222-2222-222222222226',
  'negociacao',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "Diretor Médico", "interesse": "Sistema de prontuários", "orcamento": "R$ 40.000", "urgencia": "Média"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333338',
  'Fernanda Oliveira',
  'fernanda.oliveira@email.com',
  '(11) 4321-0987',
  NULL,
  'novo',
  '11111111-1111-1111-1111-111111111111',
  '{"origem": "Site", "interesse": "Consultoria", "orcamento": "A definir", "urgencia": "Baixa"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333339',
  'Rafael Pereira',
  'rafael.pereira@startup.com',
  '(11) 3210-9876',
  NULL,
  'qualificado',
  '11111111-1111-1111-1111-111111111111',
  '{"cargo": "CEO", "interesse": "CRM completo", "orcamento": "R$ 25.000", "urgencia": "Alta"}'::jsonb
);

-- =====================================================
-- 4. CRIAR PIPELINES
-- =====================================================

INSERT INTO public.pipelines (id, name, description, team_id) VALUES
(
  '44444444-4444-4444-4444-444444444444',
  'Pipeline de Vendas B2B',
  'Pipeline principal para vendas corporativas',
  '11111111-1111-1111-1111-111111111111'
),
(
  '44444444-4444-4444-4444-444444444445',
  'Pipeline de Parcerias',
  'Pipeline específico para desenvolvimento de parcerias estratégicas',
  '11111111-1111-1111-1111-111111111111'
);

-- =====================================================
-- 5. CRIAR ETAPAS DOS PIPELINES
-- =====================================================

INSERT INTO public.pipeline_stages (id, pipeline_id, stage_name, stage_order) VALUES
-- Pipeline de Vendas B2B
(
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'Primeiro Contato',
  1
),
(
  '55555555-5555-5555-5555-555555555556',
  '44444444-4444-4444-4444-444444444444',
  'Qualificação',
  2
),
(
  '55555555-5555-5555-5555-555555555557',
  '44444444-4444-4444-4444-444444444444',
  'Apresentação',
  3
),
(
  '55555555-5555-5555-5555-555555555558',
  '44444444-4444-4444-4444-444444444444',
  'Proposta',
  4
),
(
  '55555555-5555-5555-5555-555555555559',
  '44444444-4444-4444-4444-444444444444',
  'Negociação',
  5
),
(
  '55555555-5555-5555-5555-55555555555A',
  '44444444-4444-4444-4444-444444444444',
  'Fechamento',
  6
),
-- Pipeline de Parcerias
(
  '55555555-5555-5555-5555-55555555555B',
  '44444444-4444-4444-4444-444444444445',
  'Identificação',
  1
),
(
  '55555555-5555-5555-5555-55555555555C',
  '44444444-4444-4444-4444-444444444445',
  'Avaliação',
  2
),
(
  '55555555-5555-5555-5555-55555555555D',
  '44444444-4444-4444-4444-444444444445',
  'Negociação',
  3
),
(
  '55555555-5555-5555-5555-55555555555E',
  '44444444-4444-4444-4444-444444444445',
  'Contrato',
  4
);

-- =====================================================
-- 6. RELACIONAR LEADS COM PIPELINES
-- =====================================================

INSERT INTO public.lead_pipelines (id, lead_id, pipeline_id, current_stage_id) VALUES
(
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555557' -- Apresentação
),
(
  '66666666-6666-6666-6666-666666666667',
  '33333333-3333-3333-3333-333333333334',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555556' -- Qualificação
),
(
  '66666666-6666-6666-6666-666666666668',
  '33333333-3333-3333-3333-333333333335',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555' -- Primeiro Contato
),
(
  '66666666-6666-6666-6666-666666666669',
  '33333333-3333-3333-3333-333333333336',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555558' -- Proposta
),
(
  '66666666-6666-6666-6666-66666666666A',
  '33333333-3333-3333-3333-333333333337',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555559' -- Negociação
),
(
  '66666666-6666-6666-6666-66666666666B',
  '33333333-3333-3333-3333-333333333339',
  '44444444-4444-4444-4444-444444444445',
  '55555555-5555-5555-5555-55555555555C' -- Avaliação
);

-- =====================================================
-- 7. CRIAR ATIVIDADES
-- =====================================================

INSERT INTO public.activities (id, title, description, lead_id, scheduled_date, scheduled_time, completed, team_id) VALUES
(
  '77777777-7777-7777-7777-777777777777',
  'Reunião de apresentação',
  'Apresentar soluções de CRM para o CTO da Tech Inovações',
  '33333333-3333-3333-3333-333333333333',
  CURRENT_DATE + INTERVAL '2 days',
  '14:00:00',
  false,
  '11111111-1111-1111-1111-111111111111'
),
(
  '77777777-7777-7777-7777-777777777778',
  'Follow-up por telefone',
  'Ligar para Marina Silva para verificar interesse',
  '33333333-3333-3333-3333-333333333334',
  CURRENT_DATE + INTERVAL '1 day',
  '10:30:00',
  false,
  '11111111-1111-1111-1111-111111111111'
),
(
  '77777777-7777-7777-7777-777777777779',
  'Envio de proposta comercial',
  'Elaborar e enviar proposta detalhada para a Clínica Saúde Total',
  '33333333-3333-3333-3333-333333333337',
  CURRENT_DATE + INTERVAL '3 days',
  '16:00:00',
  false,
  '11111111-1111-1111-1111-111111111111'
),
(
  '77777777-7777-7777-7777-77777777777A',
  'Demo do sistema',
  'Demonstração prática do sistema para Ana Costa',
  '33333333-3333-3333-3333-333333333336',
  CURRENT_DATE + INTERVAL '5 days',
  '11:00:00',
  false,
  '11111111-1111-1111-1111-111111111111'
),
(
  '77777777-7777-7777-7777-77777777777B',
  'Reunião de alinhamento',
  'Reunião realizada com sucesso - próximos passos definidos',
  '33333333-3333-3333-3333-333333333333',
  CURRENT_DATE - INTERVAL '2 days',
  '15:30:00',
  true,
  '11111111-1111-1111-1111-111111111111'
);

-- =====================================================
-- 8. CRIAR LOGS DE ATIVIDADES
-- =====================================================

INSERT INTO public.lead_activity_logs (id, lead_id, action_type, description, details) VALUES
(
  '88888888-8888-8888-8888-888888888888',
  '33333333-3333-3333-3333-333333333333',
  'contato_inicial',
  'Primeiro contato realizado via telefone',
  '{"canal": "telefone", "duracao": "15 minutos", "resultado": "interesse confirmado"}'::jsonb
),
(
  '88888888-8888-8888-8888-888888888889',
  '33333333-3333-3333-3333-333333333334',
  'email_enviado',
  'Material comercial enviado por email',
  '{"tipo": "apresentacao", "anexos": ["brochure.pdf", "casos_sucesso.pdf"]}'::jsonb
),
(
  '88888888-8888-8888-8888-88888888888A',
  '33333333-3333-3333-3333-333333333335',
  'reuniao_agendada',
  'Reunião agendada para próxima semana',
  '{"data": "2024-01-15", "horario": "14:00", "local": "escritório cliente"}'::jsonb
),
(
  '88888888-8888-8888-8888-88888888888B',
  '33333333-3333-3333-3333-333333333336',
  'proposta_enviada',
  'Proposta comercial enviada',
  '{"valor": "R$ 15.000", "prazo": "30 dias", "desconto": "10%"}'::jsonb
),
(
  '88888888-8888-8888-8888-88888888888C',
  '33333333-3333-3333-3333-333333333337',
  'negociacao_iniciada',
  'Início das negociações contratuais',
  '{"pontos_negociacao": ["prazo", "valor", "suporte"], "posicao": "positiva"}'::jsonb
);

-- =====================================================
-- 9. CRIAR CAMPOS CUSTOMIZADOS
-- =====================================================

INSERT INTO public.custom_field_definitions (id, team_id, entity_type, field_name, display_name, field_type, field_options, is_required, sort_order) VALUES
(
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  'lead',
  'origem',
  'Origem do Lead',
  'select',
  '{"options": ["Site", "Indicação", "Evento", "Cold Call", "LinkedIn", "Google Ads"]}'::jsonb,
  false,
  1
),
(
  '99999999-9999-9999-9999-99999999999A',
  '11111111-1111-1111-1111-111111111111',
  'lead',
  'orcamento',
  'Orçamento Disponível',
  'text',
  NULL,
  false,
  2
),
(
  '99999999-9999-9999-9999-99999999999B',
  '11111111-1111-1111-1111-111111111111',
  'lead',
  'urgencia',
  'Urgência',
  'select',
  '{"options": ["Baixa", "Média", "Alta", "Crítica"]}'::jsonb,
  false,
  3
),
(
  '99999999-9999-9999-9999-99999999999C',
  '11111111-1111-1111-1111-111111111111',
  'company',
  'segmento',
  'Segmento de Mercado',
  'select',
  '{"options": ["Tecnologia", "Saúde", "Educação", "Varejo", "Construção", "Serviços"]}'::jsonb,
  false,
  1
),
(
  '99999999-9999-9999-9999-99999999999D',
  '11111111-1111-1111-1111-111111111111',
  'company',
  'funcionarios',
  'Número de Funcionários',
  'select',
  '{"options": ["1-10", "11-50", "51-200", "201-1000", "1000+"]}'::jsonb,
  false,
  2
);

-- =====================================================
-- 10. CONFIGURAÇÕES DO WHATSAPP
-- =====================================================

INSERT INTO public.whatsapp_settings (id, team_id, auto_reply, business_hours, auto_reply_message, business_name, phone_number) VALUES
(
  'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
  '11111111-1111-1111-1111-111111111111',
  true,
  true,
  'Olá! Obrigado pelo contato. Nossa equipe responderá em breve durante o horário comercial (8h às 18h).',
  'Vendas Master',
  '+55 11 99999-8888'
);

-- =====================================================
-- 11. MENSAGENS DO WHATSAPP
-- =====================================================

INSERT INTO public.whatsapp_messages (id, lead_phone, lead_name, message, direction, message_id, status, timestamp, team_id) VALUES
(
  'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
  '+5511987654321',
  'Carlos Mendes',
  'Olá, gostaria de saber mais sobre as soluções de CRM',
  'inbound',
  'msg_001',
  'received',
  NOW() - INTERVAL '2 hours',
  '11111111-1111-1111-1111-111111111111'
),
(
  'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBC',
  '+5511987654321',
  'Carlos Mendes',
  'Olá Carlos! Fico feliz com seu interesse. Vou te enviar um material sobre nossas soluções.',
  'outbound',
  'msg_002',
  'delivered',
  NOW() - INTERVAL '1 hour',
  '11111111-1111-1111-1111-111111111111'
),
(
  'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBD',
  '+5511876543210',
  'Marina Silva',
  'Bom dia! Vocês têm soluções para construtoras?',
  'inbound',
  'msg_003',
  'received',
  NOW() - INTERVAL '30 minutes',
  '11111111-1111-1111-1111-111111111111'
);

-- =====================================================
-- 12. CONFIGURAÇÃO EVOLUTION API
-- =====================================================

INSERT INTO public.evolution_api_config (id, team_id, instance_url, instance_name, api_key, security_token) VALUES
(
  'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
  '11111111-1111-1111-1111-111111111111',
  'https://api.evolution.com',
  'vendas_master_instance',
  'demo_api_key_12345',
  'demo_security_token_67890'
);

-- =====================================================
-- 13. CONVERSAS EVOLUTION API
-- =====================================================

INSERT INTO public.evolution_api_chats (id, team_id, phone, name, last_message, unread_count, whatsapp_jid) VALUES
(
  'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
  '11111111-1111-1111-1111-111111111111',
  '+5511987654321',
  'Carlos Mendes',
  'Aguardo o material sobre CRM',
  1,
  '5511987654321@s.whatsapp.net'
),
(
  'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDE',
  '11111111-1111-1111-1111-111111111111',
  '+5511876543210',
  'Marina Silva',
  'Vocês têm soluções para construtoras?',
  1,
  '5511876543210@s.whatsapp.net'
);

-- =====================================================
-- 14. MENSAGENS EVOLUTION API
-- =====================================================

INSERT INTO public.evolution_api_messages (id, team_id, chat_id, phone, text, from_me, status) VALUES
(
  'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE',
  '11111111-1111-1111-1111-111111111111',
  'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
  '+5511987654321',
  'Olá, gostaria de saber mais sobre as soluções de CRM',
  false,
  'received'
),
(
  'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEF',
  '11111111-1111-1111-1111-111111111111',
  'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
  '+5511987654321',
  'Olá Carlos! Fico feliz com seu interesse. Vou te enviar um material sobre nossas soluções.',
  true,
  'sent'
),
(
  'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEE0',
  '11111111-1111-1111-1111-111111111111',
  'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDE',
  '+5511876543210',
  'Bom dia! Vocês têm soluções para construtoras?',
  false,
  'received'
);

-- =====================================================
-- MENSAGEM DE CONFIRMAÇÃO
-- =====================================================

SELECT 
  'Dados de exemplo inseridos com sucesso!' as status,
  (SELECT COUNT(*) FROM public.teams) as teams_criados,
  (SELECT COUNT(*) FROM public.companies) as empresas_criadas,
  (SELECT COUNT(*) FROM public.leads) as leads_criados,
  (SELECT COUNT(*) FROM public.pipelines) as pipelines_criados,
  (SELECT COUNT(*) FROM public.pipeline_stages) as etapas_criadas,
  (SELECT COUNT(*) FROM public.activities) as atividades_criadas,
  (SELECT COUNT(*) FROM public.custom_field_definitions) as campos_customizados; 