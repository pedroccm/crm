"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTeam } from "@/lib/team-context";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FixTeamCreationComponent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { teams, fetchTeams } = useTeam();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testTeamName, setTestTeamName] = useState("");

  const checkUserProfile = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch("/api/check-profile");
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Perfil do usuário verificado: ${data.profile.email}`);
      } else {
        setError(data.error || "Erro ao verificar perfil do usuário");
      }
    } catch (error) {
      setError("Erro ao verificar perfil do usuário");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const promoteToSuperAdmin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch("/api/promote-to-super-admin");
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Usuário promovido a super admin com sucesso!");
      } else {
        setError(data.error || "Erro ao promover usuário a super admin");
      }
    } catch (error) {
      setError("Erro ao promover usuário a super admin");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createTestTeam = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!testTeamName) {
      setError("Nome do time é obrigatório");
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/create-test-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: testTeamName }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Time de teste "${data.team.name}" criado com sucesso!`);
        setTestTeamName("");
        // Atualizar a lista de times
        await fetchTeams();
      } else {
        setError(data.error || "Erro ao criar time de teste");
      }
    } catch (error) {
      setError("Erro ao criar time de teste");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fixTeamMembers = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch("/api/fix-team-members");
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Funções e políticas de team_members corrigidas com sucesso!");
        toast({
          title: "Sucesso",
          description: "Funções e políticas de team_members corrigidas com sucesso!",
        });
      } else {
        setError(data.error || "Erro ao corrigir funções e políticas de team_members");
      }
    } catch (error) {
      setError("Erro ao corrigir funções e políticas de team_members");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico de Criação de Times</CardTitle>
        <CardDescription>
          Ferramentas para diagnosticar e corrigir problemas na criação de times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Sucesso</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Verificação de Perfil</h3>
          <p className="text-sm text-muted-foreground">
            Verifica se o perfil do usuário atual existe e está configurado corretamente.
          </p>
          <Button onClick={checkUserProfile} disabled={loading}>
            {loading ? "Verificando..." : "Verificar Perfil"}
          </Button>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Promoção a Super Admin</h3>
          <p className="text-sm text-muted-foreground">
            Promove o usuário atual a super admin para permitir a criação de times.
          </p>
          <Button onClick={promoteToSuperAdmin} disabled={loading}>
            {loading ? "Promovendo..." : "Promover a Super Admin"}
          </Button>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Criar Time de Teste</h3>
          <p className="text-sm text-muted-foreground">
            Cria um time de teste para verificar se a funcionalidade está operando corretamente.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do time"
              value={testTeamName}
              onChange={(e) => setTestTeamName(e.target.value)}
            />
            <Button onClick={createTestTeam} disabled={loading || !testTeamName}>
              {loading ? "Criando..." : "Criar Time"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Corrigir Funções e Políticas de Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Corrige o problema de ambiguidade na coluna team_id nas funções e políticas de team_members.
          </p>
          <Button onClick={fixTeamMembers} disabled={loading}>
            {loading ? "Corrigindo..." : "Corrigir Team Members"}
          </Button>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Times Existentes</h3>
          <div className="border rounded-md p-4">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum time encontrado.</p>
            ) : (
              <ul className="space-y-2">
                {teams.map((team) => (
                  <li key={team.id} className="text-sm">
                    <strong>{team.name}</strong> ({team.slug})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Usuário atual: {user?.email || "Não autenticado"}
        </p>
      </CardFooter>
    </Card>
  );
} 