-- Script para corrigir as políticas de segurança da tabela activities

-- 1. Primeiro, remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura pública de atividades" ON activities;
DROP POLICY IF EXISTS "Permitir inserção de atividades por qualquer usuário" ON activities;
DROP POLICY IF EXISTS "Permitir atualização de atividades por qualquer usuário" ON activities;
DROP POLICY IF EXISTS "Permitir exclusão de atividades por qualquer usuário" ON activities;
DROP POLICY IF EXISTS "Permitir inserção de atividades por usuários autenticados" ON activities;
DROP POLICY IF EXISTS "Permitir atualização de atividades por usuários autenticados" ON activities;
DROP POLICY IF EXISTS "Permitir exclusão de atividades por usuários autenticados" ON activities;

-- 2. Garantir que o RLS está habilitado para a tabela
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas adequadas
-- 3.1. Política para permitir leitura pública (qualquer pessoa pode ver as atividades)
CREATE POLICY "Permitir leitura pública de atividades" 
ON activities
FOR SELECT 
USING (true);

-- 3.2. Política para permitir inserção por usuários autenticados e anônimos
CREATE POLICY "Permitir inserção de atividades" 
ON activities
FOR INSERT 
WITH CHECK (true);

-- 3.3. Política para permitir atualização por usuários autenticados e anônimos
CREATE POLICY "Permitir atualização de atividades" 
ON activities
FOR UPDATE 
USING (true);

-- 3.4. Política para permitir exclusão por usuários autenticados e anônimos
CREATE POLICY "Permitir exclusão de atividades" 
ON activities
FOR DELETE 
USING (true);

-- 4. Verificar e criar a função do gatilho para atualizar o campo completed_at
CREATE OR REPLACE FUNCTION update_activity_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar ou substituir o gatilho
DROP TRIGGER IF EXISTS set_activity_completed_at ON activities;
CREATE TRIGGER set_activity_completed_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activity_completed_at(); 