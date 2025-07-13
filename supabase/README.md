# Configuração do Supabase para o Gaia CRM

Este diretório contém os scripts SQL necessários para configurar o banco de dados Supabase para o Gaia CRM.

## Configuração da Autenticação

Para configurar a autenticação no Supabase, siga os passos abaixo:

1. Acesse o painel de controle do Supabase (https://app.supabase.io)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor"
4. Execute os scripts na seguinte ordem:

### 1. Configuração da Autenticação

Execute o script `auth.sql` para configurar a tabela de perfis de usuários e as políticas de segurança.

### 2. Correção das Políticas de Segurança para Perfis

Se estiver enfrentando problemas com as políticas de segurança da tabela `profiles`, execute o script `fix_profiles_rls.sql` para corrigir as permissões.

### 3. Correção das Configurações de Cookies

Se estiver enfrentando problemas com autenticação em loop ou cookies não sendo definidos corretamente, execute o script `fix_auth_cookies.sql` para corrigir as configurações de cookies e políticas de segurança.

### 4. Atualização das Políticas de Segurança

Execute o script `update_rls.sql` para atualizar as políticas de segurança das tabelas existentes.

### 5. Configuração das Atividades

Execute o script `activities.sql` para configurar a tabela de atividades.

## Configuração do Primeiro Usuário Administrador

Após criar o primeiro usuário através da interface do CRM, você precisa configurá-lo como administrador. Para isso, execute o seguinte comando SQL no Supabase:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'seu_email@exemplo.com';
```

Substitua `seu_email@exemplo.com` pelo email do usuário que você deseja tornar administrador.

## Configuração do Provedor de Email

Para que o sistema de recuperação de senha funcione corretamente, você precisa configurar um provedor de email no Supabase:

1. Acesse o painel de controle do Supabase
2. Vá para "Authentication" > "Email Templates"
3. Configure os templates de email para:
   - Confirmação de email
   - Convite
   - Redefinição de senha
   - Alteração de email

## Configuração do Site URL

Para que os links nos emails funcionem corretamente, configure o Site URL:

1. Acesse o painel de controle do Supabase
2. Vá para "Authentication" > "URL Configuration"
3. Configure o Site URL para a URL do seu site (ex: https://seu-site.com)
4. Configure as URLs de redirecionamento para incluir as URLs do seu site

## Solução de Problemas Comuns

### Erro 403 ao Criar Perfil

Se estiver recebendo erro 403 (Forbidden) ao tentar criar perfis, execute o script `fix_profiles_rls.sql` para corrigir as políticas de segurança da tabela `profiles`.

### Erro de Login em Loop

Se o login estiver em um loop infinito, verifique:

1. Se o usuário existe no Supabase (Authentication > Users)
2. Se o perfil do usuário existe na tabela `profiles`
3. Execute o script `fix_auth_cookies.sql` para corrigir as configurações de cookies e políticas de segurança
4. Verifique se o Site URL está configurado corretamente

### Cookies não estão sendo definidos

Se os cookies de autenticação não estiverem sendo definidos corretamente:

1. Execute o script `fix_auth_cookies.sql` para corrigir as configurações de cookies
2. Verifique se o Site URL está configurado corretamente
3. Certifique-se de que o domínio do seu site corresponde ao domínio configurado no Supabase 