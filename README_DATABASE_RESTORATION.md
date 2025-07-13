# Restauração da Base de Dados - Gaia CRM

## 📋 Visão Geral

Este documento contém as instruções completas para recriar a base de dados do sistema Gaia CRM no Supabase após a perda dos dados.

## 🗂️ Arquivo Principal

**`gaia_crm_complete_database.sql`** - Script SQL completo com todas as tabelas, funções, políticas e estruturas necessárias.

## 🚀 Instruções de Instalação

### 1. Configurar o Supabase

1. Acesse o painel do Supabase: https://app.supabase.io
2. Crie um novo projeto ou use o projeto existente
3. Vá para a seção **SQL Editor**

### 2. Executar o Script

1. Copie todo o conteúdo do arquivo `gaia_crm_complete_database.sql`
2. Cole no SQL Editor do Supabase
3. Execute o script completo
4. Aguarde a conclusão da execução

### 3. Configurar o Primeiro Usuário

Após a execução do script, configure o primeiro usuário como super administrador:

```sql
UPDATE public.profiles SET is_super_admin = TRUE WHERE email = 'seu_email@exemplo.com';
```

Substitua `seu_email@exemplo.com` pelo email do primeiro usuário.

## 📊 Estrutura da Base de Dados

### Tabelas Principais

1. **`profiles`** - Perfis de usuários do sistema
2. **`teams`** - Times/equipes
3. **`team_members`** - Membros dos times
4. **`team_invitations`** - Convites para times
5. **`companies`** - Empresas/clientes
6. **`leads`** - Leads do sistema
7. **`pipelines`** - Pipelines de vendas
8. **`pipeline_stages`** - Etapas dos pipelines
9. **`lead_pipelines`** - Relacionamento leads-pipelines
10. **`lead_activity_logs`** - Log de atividades
11. **`activities`** - Atividades agendadas

### Tabelas WhatsApp

12. **`whatsapp_settings`** - Configurações WhatsApp
13. **`whatsapp_messages`** - Mensagens WhatsApp

### Tabelas Evolution API

14. **`evolution_api_config`** - Configurações Evolution API
15. **`evolution_api_chats`** - Conversas Evolution API
16. **`evolution_api_messages`** - Mensagens Evolution API

### Tabelas de Personalização

17. **`custom_field_definitions`** - Campos personalizados

## 🛠️ Funções Criadas

- **`create_profile_for_user()`** - Cria perfil automaticamente
- **`update_updated_at_column()`** - Atualiza timestamp
- **`is_team_member()`** - Verifica se é membro do time
- **`has_team_role()`** - Verifica função no time
- **`is_team_admin()`** - Verifica se é admin do time
- **`is_super_admin()`** - Verifica se é super admin
- **`update_activity_completed_at()`** - Atualiza data de conclusão
- **`execute_raw_sql()`** - Executa SQL (só super admin)

## 🔐 Recursos de Segurança

- **Row Level Security (RLS)** completo em todas as tabelas
- **Políticas de segurança** detalhadas baseadas em times
- **Triggers** para timestamps automáticos
- **Funções auxiliares** para verificação de permissões
- **Índices** para performance otimizada

## 📝 Estrutura de Dados Detalhada

### Tabela `profiles`
```sql
- id (UUID, PK) - Referência ao auth.users
- email (TEXT, UNIQUE) - Email do usuário
- name (TEXT) - Nome do usuário
- role (TEXT) - Função do usuário
- is_super_admin (BOOLEAN) - Se é super admin
- created_at, updated_at (TIMESTAMP)
```

### Tabela `teams`
```sql
- id (UUID, PK) - Identificador único
- name (TEXT) - Nome do time
- slug (TEXT, UNIQUE) - Slug único do time
- logo_url (TEXT) - URL do logo
- description (TEXT) - Descrição
- created_by (UUID) - Criador do time
- created_at, updated_at (TIMESTAMP)
```

### Tabela `companies`
```sql
- id (UUID, PK) - Identificador único
- name (TEXT) - Nome da empresa
- email (TEXT) - Email da empresa
- phone (TEXT) - Telefone
- address (TEXT) - Endereço
- website (TEXT) - Website
- team_id (UUID) - Time proprietário
- custom_fields (JSONB) - Campos customizados
- created_at, updated_at (TIMESTAMP)
```

### Tabela `leads`
```sql
- id (UUID, PK) - Identificador único
- name (TEXT) - Nome do lead
- email (TEXT) - Email do lead
- phone (TEXT) - Telefone
- company_id (UUID) - Empresa associada
- status (TEXT) - Status do lead
- team_id (UUID) - Time proprietário
- custom_fields (JSONB) - Campos customizados
- created_at, updated_at (TIMESTAMP)
```

### Tabela `pipelines`
```sql
- id (UUID, PK) - Identificador único
- name (TEXT) - Nome do pipeline
- description (TEXT) - Descrição
- team_id (UUID) - Time proprietário
- created_at, updated_at (TIMESTAMP)
```

### Tabela `activities`
```sql
- id (UUID, PK) - Identificador único
- title (TEXT) - Título da atividade
- description (TEXT) - Descrição
- lead_id (UUID) - Lead associado
- scheduled_date (DATE) - Data agendada
- scheduled_time (TIME) - Hora agendada
- completed (BOOLEAN) - Se foi concluída
- completed_at (TIMESTAMP) - Data de conclusão
- team_id (UUID) - Time proprietário
- created_at (TIMESTAMP)
```

## ⚠️ Notas Importantes

1. **Backup**: Sempre faça backup da nova base de dados após a configuração
2. **Permissões**: Verifique se todas as políticas RLS estão funcionando corretamente
3. **Teste**: Teste todas as funcionalidades após a restauração
4. **Super Admin**: Configure pelo menos um usuário como super admin
5. **Teams**: Crie pelo menos um time para começar a usar o sistema

## 🔧 Configuração Adicional

### Configurar Autenticação

No painel do Supabase, configure:

1. **Authentication** → **Settings** → **Site URL**
2. **Authentication** → **Providers** → Configure provedores necessários
3. **Authentication** → **Email Templates** → Configure templates de email

### Configurar Storage (se necessário)

Se o sistema usar storage para arquivos:

1. **Storage** → **Create bucket**
2. Configure políticas de acesso conforme necessário

## 🆘 Troubleshooting

### Erro de Permissões
Se houver erros de permissões, execute:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

### Erro de Triggers
Se houver erros com triggers, verifique se todas as funções foram criadas corretamente.

### Erro de RLS
Se houver problemas com RLS, verifique se todas as políticas foram criadas e estão ativas.

## 📞 Suporte

Em caso de problemas durante a restauração, verifique:

1. Se o script foi executado completamente
2. Se não há erros no log do SQL Editor
3. Se todas as tabelas foram criadas
4. Se o primeiro usuário foi configurado como super admin

---

**Última atualização**: Dezembro 2024
**Versão**: 1.0.0
**Sistema**: Gaia CRM 