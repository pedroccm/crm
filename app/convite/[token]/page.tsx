"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/lib/team-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InvitePageProps {
  params: {
    token: string;
  };
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = params;
  const router = useRouter();
  const { user, loading: isAuthLoading } = useAuth();
  const { acceptInvitation } = useTeam();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Buscar informações do convite
  useEffect(() => {
    const fetchInvitation = async () => {
      if (isAuthLoading) return;
      
      try {
        // Buscar o convite pelo token
        const { data: invitationData, error: invitationError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("token", token)
          .single();
        
        if (invitationError) {
          throw new Error("Convite não encontrado ou expirado");
        }
        
        // Verificar se o convite expirou
        if (new Date(invitationData.expires_at) < new Date()) {
          throw new Error("Este convite expirou");
        }
        
        setInvitation(invitationData);
        
        // Buscar informações do time
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("id", invitationData.team_id)
          .single();
        
        if (teamError) {
          throw new Error("Time não encontrado");
        }
        
        setTeam(teamData);
        
        // Se o usuário estiver logado, verificar se o email corresponde
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .single();
          
          if (profileError) {
            throw new Error("Erro ao verificar perfil do usuário");
          }
          
          if (profile.email !== invitationData.email) {
            throw new Error(`Este convite é para ${invitationData.email}, mas você está logado com outra conta`);
          }
        }
      } catch (error: any) {
        console.error("Erro ao buscar convite:", error);
        setError(error.message || "Erro ao buscar convite");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitation();
  }, [token, user, isAuthLoading]);
  
  // Função para aceitar o convite
  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirecionar para login com redirecionamento de volta para esta página
      router.push(`/login?redirect=/convite/${token}`);
      return;
    }
    
    setIsAccepting(true);
    
    try {
      const success = await acceptInvitation(token);
      
      if (success) {
        toast.success("Convite aceito com sucesso!");
        router.push("/dashboard");
      } else {
        throw new Error("Erro ao aceitar convite");
      }
    } catch (error: any) {
      console.error("Erro ao aceitar convite:", error);
      toast.error(error.message || "Erro ao aceitar convite");
    } finally {
      setIsAccepting(false);
    }
  };
  
  // Renderizar estado de carregamento
  if (isLoading || isAuthLoading) {
    return (
      <div className="container mx-auto py-10 max-w-md">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Renderizar erro
  if (error || !invitation || !team) {
    return (
      <div className="container mx-auto py-10 max-w-md">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <XCircle className="mr-2 h-5 w-5" />
              Convite Inválido
            </CardTitle>
            <CardDescription>
              Não foi possível processar este convite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || "Este convite não existe ou expirou."}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push("/")}
            >
              Voltar para a página inicial
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Renderizar convite válido
  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Convite para Time
          </CardTitle>
          <CardDescription>
            Você foi convidado para participar de um time no Gaia CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Time:</p>
            <p className="text-lg font-bold">{team.name}</p>
          </div>
          
          {team.description && (
            <div>
              <p className="text-sm font-medium">Descrição:</p>
              <p className="text-sm">{team.description}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium">Você foi convidado como:</p>
            <p className="text-sm font-semibold">
              {invitation.role === "admin" 
                ? "Administrador" 
                : invitation.role === "guest"
                  ? "Convidado"
                  : "Membro"}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium">Email do convite:</p>
            <p className="text-sm">{invitation.email}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium">Expira em:</p>
            <p className="text-sm">
              {new Date(invitation.expires_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full"
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aceitando...
              </>
            ) : (
              "Aceitar Convite"
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push("/")}
          >
            Voltar para a página inicial
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 