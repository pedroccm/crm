'use client';

import { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function SupabaseConnectionTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // Verificar se as variáveis de ambiente estão disponíveis
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      setDebugInfo(`URL disponível: ${!!url}\nChave disponível: ${!!key}`);
      
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao conectar ao Supabase';
      setError(errorMessage);
      setIsConnected(false);
      
      // Adicionar mais informações de debug
      if (err instanceof Error) {
        setDebugInfo(`Erro completo: ${err.stack || err.toString()}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">Status da Conexão com Supabase</h2>
      
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Verificando conexão...</span>
        </div>
      ) : isConnected === null ? (
        <div>Iniciando verificação...</div>
      ) : isConnected ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle>Conectado!</AlertTitle>
          <AlertDescription>
            Conexão com Supabase estabelecida com sucesso.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-5 w-5 text-red-600" />
            <AlertTitle>Falha na conexão</AlertTitle>
            <AlertDescription>
              {error || 'Não foi possível conectar ao Supabase. Verifique suas credenciais.'}
            </AlertDescription>
          </Alert>
          
          {debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-semibold mb-2">Informações de Debug:</h3>
              <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
        </>
      )}

      <Button 
        onClick={testConnection} 
        disabled={isLoading}
        className="mt-2"
      >
        {isLoading ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Testar Conexão
          </>
        )}
      </Button>
    </div>
  );
} 