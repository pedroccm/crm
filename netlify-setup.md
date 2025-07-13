# Configuração do Netlify - Gaia CRM

## 🔧 Configurar Variáveis de Ambiente

Para resolver os erros de build, você precisa configurar as variáveis de ambiente no Netlify:

### 1. Acessar Configurações do Site

1. Acesse seu projeto no Netlify Dashboard
2. Vá em **Site settings** → **Environment variables**

### 2. Adicionar Variáveis do Supabase

Adicione estas variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://mpkbljfudwznidtzyywf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2JsamZ1ZHd6bmlkdHp5eXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY5NjAsImV4cCI6MjA2ODAxMjk2MH0.G_yTzNaDyU5fhd0NvT_uOgMzA0qRy0ckhFP5SMfmSis
```

### 3. Configurações Opcionais do WhatsApp

Se você usar WhatsApp, adicione também:

```
NEXT_PUBLIC_WHATSAPP_ACCESS_TOKEN=sua_chave_aqui
NEXT_PUBLIC_WHATSAPP_API_VERSION=v18.0
NEXT_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID=seu_id_aqui
NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui
NEXT_PUBLIC_WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_aqui
```

## 🚀 Deploy Settings

### Build Command
```
npm run build
```

### Publish Directory
```
.next
```

### Node Version
Adicione arquivo `.nvmrc` na raiz:
```
18
```

## 🔄 Como Aplicar

1. **Configure as variáveis** no painel do Netlify
2. **Redeploy** o site (Deploys → Trigger deploy → Deploy site)
3. **Verifique** se o build passa sem erros

## ✅ Checklist

- [ ] Variáveis NEXT_PUBLIC_SUPABASE_URL configurada
- [ ] Variáveis NEXT_PUBLIC_SUPABASE_ANON_KEY configurada  
- [ ] Build command configurado
- [ ] Publish directory configurado
- [ ] Site redeployado

## 🆘 Problemas Comuns

### Erro: "Credenciais do Supabase não configuradas"
**Solução**: Verifique se as variáveis foram adicionadas corretamente no Netlify

### Erro: "useSearchParams() should be wrapped in suspense"
**Solução**: Já corrigido nos arquivos de código

### Erro: "fetch failed"
**Solução**: Configurar as variáveis de ambiente resolve esse problema

## 📞 Verificação

Após configurar, o build deve passar sem erros e o site deve funcionar normalmente. 