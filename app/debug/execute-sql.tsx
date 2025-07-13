"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExecuteSQLComponent() {
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [success, setSuccess] = useState(false);

  const executeSQL = async () => {
    if (!sql.trim()) {
      setError("Por favor, insira um comando SQL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSuccess(false);
    
    try {
      // Executar SQL diretamente (isso só funciona se o usuário tiver permissões)
      const { data, error: sqlError } = await supabase.rpc('execute_raw_sql', {
        sql_query: sql
      });
      
      if (sqlError) {
        throw new Error(`Erro ao executar SQL: ${sqlError.message}`);
      }
      
      setResult(data);
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao executar SQL:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeFixProfiles = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccess(false);
    
    try {
      const fixProfilesSQL = `
      -- Verificar se a tabela de perfis existe
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
          RAISE NOTICE 'A tabela profiles não existe. Criando...';
          
          -- Criar a tabela de perfis
          CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE,
            name TEXT,
            role TEXT DEFAULT 'user',
            is_super_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Criar índices
          CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
          CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
          CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles(is_super_admin);
          
          -- Habilitar RLS
          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ELSE
          RAISE NOTICE 'A tabela profiles já existe.';
        END IF;
      END
      $$;

      -- Verificar se a coluna is_super_admin existe
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_super_admin'
        ) THEN
          RAISE NOTICE 'A coluna is_super_admin não existe na tabela profiles. Adicionando...';
          
          -- Adicionar a coluna is_super_admin
          ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
          
          -- Criar índice
          CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles(is_super_admin);
        ELSE
          RAISE NOTICE 'A coluna is_super_admin já existe na tabela profiles.';
        END IF;
      END
      $$;
      `;
      
      // Executar SQL diretamente
      const { data, error: sqlError } = await supabase.rpc('execute_raw_sql', {
        sql_query: fixProfilesSQL
      });
      
      if (sqlError) {
        throw new Error(`Erro ao executar fix_profiles: ${sqlError.message}`);
      }
      
      setResult("Script fix_profiles executado com sucesso");
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao executar fix_profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeFixTeams = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccess(false);
    
    try {
      const fixTeamsSQL = `
      -- Verificar se a extensão de UUID está habilitada
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Verificar se a tabela teams existe
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
          RAISE NOTICE 'A tabela teams não existe. Criando...';
          
          -- Criar a tabela teams
          CREATE TABLE public.teams (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            logo_url TEXT,
            description TEXT,
            created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Criar índices
          CREATE INDEX IF NOT EXISTS teams_name_idx ON public.teams(name);
          CREATE INDEX IF NOT EXISTS teams_slug_idx ON public.teams(slug);
          CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);
          
          -- Habilitar RLS
          ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
        ELSE
          RAISE NOTICE 'A tabela teams já existe.';
        END IF;
      END
      $$;

      -- Verificar se a tabela team_members existe
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
          RAISE NOTICE 'A tabela team_members não existe. Criando...';
          
          -- Criar a tabela team_members
          CREATE TABLE public.team_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(team_id, user_id)
          );
          
          -- Criar índices
          CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
          CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
          CREATE INDEX IF NOT EXISTS team_members_role_idx ON public.team_members(role);
          
          -- Habilitar RLS
          ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
        ELSE
          RAISE NOTICE 'A tabela team_members já existe.';
        END IF;
      END
      $$;
      `;
      
      // Executar SQL diretamente
      const { data, error: sqlError } = await supabase.rpc('execute_raw_sql', {
        sql_query: fixTeamsSQL
      });
      
      if (sqlError) {
        throw new Error(`Erro ao executar fix_teams: ${sqlError.message}`);
      }
      
      setResult("Script fix_teams executado com sucesso");
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao executar fix_teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTeamFunctions = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccess(false);
    
    try {
      const teamFunctionsSQL = `
      -- Função para verificar se o usuário é membro de um time
      CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID, user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_id = $1 AND user_id = $2
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Função para verificar se o usuário tem uma determinada função em um time
      CREATE OR REPLACE FUNCTION public.has_team_role(team_id UUID, role TEXT, user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_id = $1 AND user_id = $2 AND role = $3
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Função para verificar se o usuário é admin de um time
      CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID, user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Função para verificar se o usuário é super admin
      CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = $1 AND is_super_admin = TRUE
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // Executar SQL diretamente
      const { data, error: sqlError } = await supabase.rpc('execute_raw_sql', {
        sql_query: teamFunctionsSQL
      });
      
      if (sqlError) {
        throw new Error(`Erro ao criar funções de time: ${sqlError.message}`);
      }
      
      setResult("Funções de time criadas com sucesso");
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao criar funções de time:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTeamPolicies = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccess(false);
    
    try {
      const teamPoliciesSQL = `
      -- Remover políticas existentes para evitar conflitos
      DROP POLICY IF EXISTS "Usuários podem ver times dos quais são membros" ON public.teams;
      DROP POLICY IF EXISTS "Super admins podem ver todos os times" ON public.teams;
      DROP POLICY IF EXISTS "Usuários podem criar times" ON public.teams;
      DROP POLICY IF EXISTS "Admins podem atualizar seus times" ON public.teams;
      DROP POLICY IF EXISTS "Owners podem excluir seus times" ON public.teams;
      
      -- Criar novas políticas para teams
      CREATE POLICY "Usuários podem ver times dos quais são membros"
      ON public.teams
      FOR SELECT
      USING (
        is_team_member(id) OR is_super_admin()
      );
      
      CREATE POLICY "Super admins podem ver todos os times"
      ON public.teams
      FOR SELECT
      USING (
        is_super_admin()
      );
      
      CREATE POLICY "Usuários podem criar times"
      ON public.teams
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by
      );
      
      CREATE POLICY "Admins podem atualizar seus times"
      ON public.teams
      FOR UPDATE
      USING (
        is_team_admin(id) OR is_super_admin()
      );
      
      CREATE POLICY "Owners podem excluir seus times"
      ON public.teams
      FOR DELETE
      USING (
        has_team_role(id, 'owner') OR is_super_admin()
      );
      
      -- Remover políticas existentes para team_members
      DROP POLICY IF EXISTS "Usuários podem ver membros dos times dos quais são membros" ON public.team_members;
      DROP POLICY IF EXISTS "Admins podem adicionar membros aos seus times" ON public.team_members;
      DROP POLICY IF EXISTS "Admins podem atualizar membros dos seus times" ON public.team_members;
      DROP POLICY IF EXISTS "Admins podem remover membros dos seus times" ON public.team_members;
      
      -- Criar novas políticas para team_members
      CREATE POLICY "Usuários podem ver membros dos times dos quais são membros"
      ON public.team_members
      FOR SELECT
      USING (
        is_team_member(team_id) OR is_super_admin()
      );
      
      CREATE POLICY "Admins podem adicionar membros aos seus times"
      ON public.team_members
      FOR INSERT
      WITH CHECK (
        is_team_admin(team_id) OR is_super_admin()
      );
      
      CREATE POLICY "Admins podem atualizar membros dos seus times"
      ON public.team_members
      FOR UPDATE
      USING (
        is_team_admin(team_id) OR is_super_admin()
      );
      
      CREATE POLICY "Admins podem remover membros dos seus times"
      ON public.team_members
      FOR DELETE
      USING (
        is_team_admin(team_id) OR is_super_admin() OR auth.uid() = user_id
      );
      `;
      
      // Executar SQL diretamente
      const { data, error: sqlError } = await supabase.rpc('execute_raw_sql', {
        sql_query: teamPoliciesSQL
      });
      
      if (sqlError) {
        throw new Error(`Erro ao criar políticas de time: ${sqlError.message}`);
      }
      
      setResult("Políticas de time criadas com sucesso");
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao criar políticas de time:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Executar SQL</CardTitle>
        <CardDescription>
          Execute comandos SQL diretamente no Supabase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="custom">
          <TabsList className="mb-4">
            <TabsTrigger value="custom">SQL Personalizado</TabsTrigger>
            <TabsTrigger value="fix-profiles">Fix Profiles</TabsTrigger>
            <TabsTrigger value="fix-teams">Fix Teams</TabsTrigger>
            <TabsTrigger value="team-functions">Funções de Time</TabsTrigger>
            <TabsTrigger value="team-policies">Políticas de Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="custom">
            <Textarea
              placeholder="Digite seu comando SQL aqui..."
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="min-h-[200px] font-mono"
            />
          </TabsContent>
          
          <TabsContent value="fix-profiles">
            <div className="space-y-4">
              <p>Este script irá:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Verificar se a tabela <code>profiles</code> existe e criá-la se necessário</li>
                <li>Verificar se a coluna <code>is_super_admin</code> existe e adicioná-la se necessário</li>
                <li>Criar índices necessários</li>
              </ul>
              <Button onClick={executeFixProfiles} disabled={loading}>
                Executar Fix Profiles
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="fix-teams">
            <div className="space-y-4">
              <p>Este script irá:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Verificar se a tabela <code>teams</code> existe e criá-la se necessário</li>
                <li>Verificar se a tabela <code>team_members</code> existe e criá-la se necessário</li>
                <li>Criar índices necessários</li>
              </ul>
              <Button onClick={executeFixTeams} disabled={loading}>
                Executar Fix Teams
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="team-functions">
            <div className="space-y-4">
              <p>Este script irá criar as seguintes funções:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><code>is_team_member</code> - Verifica se um usuário é membro de um time</li>
                <li><code>has_team_role</code> - Verifica se um usuário tem uma determinada função em um time</li>
                <li><code>is_team_admin</code> - Verifica se um usuário é admin de um time</li>
                <li><code>is_super_admin</code> - Verifica se um usuário é super admin</li>
              </ul>
              <Button onClick={createTeamFunctions} disabled={loading}>
                Criar Funções de Time
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="team-policies">
            <div className="space-y-4">
              <p>Este script irá criar políticas de segurança para as tabelas de time:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Políticas para a tabela <code>teams</code></li>
                <li>Políticas para a tabela <code>team_members</code></li>
              </ul>
              <Button onClick={createTeamPolicies} disabled={loading}>
                Criar Políticas de Time
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Sucesso</AlertTitle>
            <AlertDescription className="text-green-600">
              {typeof result === 'string' ? result : 'Comando executado com sucesso!'}
            </AlertDescription>
          </Alert>
        )}
        
        {result && typeof result !== 'string' && (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <h3 className="text-sm font-medium mb-2">Resultado:</h3>
            <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Tabs defaultValue="custom">
          <TabsContent value="custom">
            <Button onClick={executeSQL} disabled={loading}>
              {loading ? "Executando..." : "Executar SQL"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardFooter>
    </Card>
  );
} 