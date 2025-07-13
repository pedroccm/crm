-- Função para executar SQL diretamente (apenas para super admins)
CREATE OR REPLACE FUNCTION execute_raw_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário é super admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Apenas super admins podem executar SQL diretamente';
  END IF;
  
  -- Executar o SQL e capturar o resultado como JSON
  EXECUTE 'SELECT jsonb_build_object(''result'', TRUE, ''message'', ''SQL executado com sucesso'')' INTO result;
  
  -- Executar o SQL fornecido
  EXECUTE sql_query;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'result', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$; 