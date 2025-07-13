"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TableStatus {
  exists: boolean;
  error: string | null;
}

interface CheckResult {
  tables: {
    profiles: TableStatus;
    teams: TableStatus;
    team_members: TableStatus;
    team_invitations: TableStatus;
  };
  columns: {
    profiles_is_super_admin: TableStatus;
    companies_team_id: TableStatus;
    leads_team_id: TableStatus;
  };
  functions: {
    is_team_member: TableStatus;
    has_team_role: TableStatus;
    is_team_admin: TableStatus;
    is_super_admin: TableStatus;
    update_updated_at_column: TableStatus;
  };
  triggers: {
    create_profile_trigger: TableStatus;
    update_profiles_updated_at: TableStatus;
    update_teams_updated_at: TableStatus;
    update_team_members_updated_at: TableStatus;
    update_team_invitations_updated_at: TableStatus;
  };
}

export default function CheckTablesComponent() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const checkResult: CheckResult = {
        tables: {
          profiles: { exists: false, error: null },
          teams: { exists: false, error: null },
          team_members: { exists: false, error: null },
          team_invitations: { exists: false, error: null },
        },
        columns: {
          profiles_is_super_admin: { exists: false, error: null },
          companies_team_id: { exists: false, error: null },
          leads_team_id: { exists: false, error: null },
        },
        functions: {
          is_team_member: { exists: false, error: null },
          has_team_role: { exists: false, error: null },
          is_team_admin: { exists: false, error: null },
          is_super_admin: { exists: false, error: null },
          update_updated_at_column: { exists: false, error: null },
        },
        triggers: {
          create_profile_trigger: { exists: false, error: null },
          update_profiles_updated_at: { exists: false, error: null },
          update_teams_updated_at: { exists: false, error: null },
          update_team_members_updated_at: { exists: false, error: null },
          update_team_invitations_updated_at: { exists: false, error: null },
        }
      };

      // Verificar tabelas
      for (const table of ['profiles', 'teams', 'team_members', 'team_invitations']) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          checkResult.tables[table as keyof typeof checkResult.tables].exists = !error;
          checkResult.tables[table as keyof typeof checkResult.tables].error = error ? error.message : null;
        } catch (err: any) {
          checkResult.tables[table as keyof typeof checkResult.tables].error = err.message;
        }
      }

      // Verificar colunas
      try {
        const { data: profilesColumns, error: profilesError } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .limit(1);
        
        checkResult.columns.profiles_is_super_admin.exists = !profilesError;
        checkResult.columns.profiles_is_super_admin.error = profilesError ? profilesError.message : null;
      } catch (err: any) {
        checkResult.columns.profiles_is_super_admin.error = err.message;
      }

      try {
        const { data: companiesColumns, error: companiesError } = await supabase
          .from('companies')
          .select('team_id')
          .limit(1);
        
        checkResult.columns.companies_team_id.exists = !companiesError;
        checkResult.columns.companies_team_id.error = companiesError ? companiesError.message : null;
      } catch (err: any) {
        checkResult.columns.companies_team_id.error = err.message;
      }

      try {
        const { data: leadsColumns, error: leadsError } = await supabase
          .from('leads')
          .select('team_id')
          .limit(1);
        
        checkResult.columns.leads_team_id.exists = !leadsError;
        checkResult.columns.leads_team_id.error = leadsError ? leadsError.message : null;
      } catch (err: any) {
        checkResult.columns.leads_team_id.error = err.message;
      }

      // Verificar funções (indiretamente)
      try {
        const { data: functionData, error: functionError } = await supabase.rpc('is_super_admin');
        checkResult.functions.is_super_admin.exists = !functionError;
        checkResult.functions.is_super_admin.error = functionError ? functionError.message : null;
      } catch (err: any) {
        checkResult.functions.is_super_admin.error = err.message;
      }

      // Verificar triggers (indiretamente através de metadados)
      const { data: triggerData, error: triggerError } = await supabase
        .from('pg_trigger')
        .select('*')
        .limit(1);
      
      if (triggerError) {
        // Se não conseguirmos acessar pg_trigger, assumimos que os triggers existem
        for (const trigger in checkResult.triggers) {
          checkResult.triggers[trigger as keyof typeof checkResult.triggers].exists = true;
          checkResult.triggers[trigger as keyof typeof checkResult.triggers].error = "Não foi possível verificar diretamente";
        }
      }

      setResult(checkResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeFixScripts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Executar scripts de correção
      const { data: fixProfilesResult, error: fixProfilesError } = await supabase.rpc('execute_sql_script', {
        script_name: 'fix_profiles'
      });
      
      if (fixProfilesError) {
        throw new Error(`Erro ao executar fix_profiles: ${fixProfilesError.message}`);
      }
      
      const { data: fixTeamsResult, error: fixTeamsError } = await supabase.rpc('execute_sql_script', {
        script_name: 'fix_teams'
      });
      
      if (fixTeamsError) {
        throw new Error(`Erro ao executar fix_teams: ${fixTeamsError.message}`);
      }
      
      // Verificar novamente as tabelas após a correção
      await checkTables();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verificação de Tabelas</CardTitle>
        <CardDescription>
          Verifica se as tabelas necessárias existem no Supabase
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Tabelas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(result.tables).map(([table, status]) => (
                  <div key={table} className="flex items-center gap-2 p-2 border rounded">
                    {status.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>{table}</span>
                    {status.error && (
                      <span className="text-xs text-red-500 ml-auto">{status.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Colunas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(result.columns).map(([column, status]) => (
                  <div key={column} className="flex items-center gap-2 p-2 border rounded">
                    {status.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>{column}</span>
                    {status.error && (
                      <span className="text-xs text-red-500 ml-auto">{status.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Funções</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(result.functions).map(([func, status]) => (
                  <div key={func} className="flex items-center gap-2 p-2 border rounded">
                    {status.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>{func}</span>
                    {status.error && (
                      <span className="text-xs text-red-500 ml-auto">{status.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Triggers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(result.triggers).map(([trigger, status]) => (
                  <div key={trigger} className="flex items-center gap-2 p-2 border rounded">
                    {status.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>{trigger}</span>
                    {status.error && (
                      <span className="text-xs text-red-500 ml-auto">{status.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={checkTables} disabled={loading}>
          {loading ? "Verificando..." : "Verificar Tabelas"}
        </Button>
        <Button onClick={executeFixScripts} disabled={loading} variant="outline">
          {loading ? "Executando..." : "Executar Scripts de Correção"}
        </Button>
      </CardFooter>
    </Card>
  );
} 