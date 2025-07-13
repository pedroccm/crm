"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeam, Team } from "@/lib/team-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, 
  Calendar, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Trash, 
  Users 
} from "lucide-react";
import { CreateTeamDialog } from "@/components/create-team-dialog";

interface TeamWithStats extends Team {
  _count?: {
    members: number;
    leads: number;
  };
  owner?: {
    name: string;
    email: string;
  };
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const { isSuperAdmin } = useTeam();
  
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  
  // Verificar se o usuário é super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isSuperAdmin, router]);
  
  // Carregar todos os times
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      
      try {
        // Usando uma consulta mais simples para evitar problemas de tipagem
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        // Buscar informações adicionais para cada time
        const teamsWithStats: TeamWithStats[] = [];
        
        for (const team of data) {
          // Buscar contagem de membros
          const { count: membersCount, error: membersError } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
            
          // Buscar contagem de leads
          const { count: leadsCount, error: leadsError } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
            
          // Buscar informações do criador
          const { data: ownerData, error: ownerError } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", team.created_by)
            .single();
          
          teamsWithStats.push({
            ...team,
            _count: {
              members: membersCount || 0,
              leads: leadsCount || 0
            },
            owner: ownerError ? undefined : ownerData
          });
        }
        
        setTeams(teamsWithStats);
      } catch (error) {
        console.error("Erro ao carregar times:", error);
        toast.error("Erro ao carregar times");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, []);
  
  // Função para obter as iniciais do nome do time
  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Função para excluir um time
  const deleteTeam = async () => {
    if (!teamToDelete) return;
    
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamToDelete.id);
      
      if (error) throw error;
      
      // Atualizar a lista de times
      setTeams(teams.filter(team => team.id !== teamToDelete.id));
      
      toast.success(`Time "${teamToDelete.name}" excluído com sucesso!`);
    } catch (error) {
      console.error("Erro ao excluir time:", error);
      toast.error("Erro ao excluir time");
    } finally {
      setShowDeleteDialog(false);
      setTeamToDelete(null);
    }
  };
  
  // Filtrar times com base na pesquisa
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Times</h1>
        <Button onClick={() => setShowCreateTeamDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo Time
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar times..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 w-1/2 bg-muted rounded"></div>
                <div className="h-3 w-3/4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 w-full bg-muted rounded"></div>
                <div className="h-3 w-2/3 bg-muted rounded"></div>
              </CardContent>
              <CardFooter>
                <div className="h-8 w-full bg-muted rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={team.logo_url || ""} alt={team.name} />
                      <AvatarFallback>
                        {getTeamInitials(team.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>@{team.slug}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/times/${team.id}`)}
                      >
                        Gerenciar Time
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setTeamToDelete(team);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Excluir Time
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {team.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {team.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{team._count?.members || 0} membros</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 mr-1" />
                    <span>{team._count?.leads || 0} leads</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {new Date(team.created_at || "").toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => router.push(`/admin/times/${team.id}`)}
                >
                  <span>Gerenciar Time</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum time encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? `Nenhum time corresponde à pesquisa "${searchQuery}"`
              : "Não há times cadastrados no sistema"}
          </p>
        </div>
      )}
      
      {/* Diálogo de confirmação para excluir time */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o time
              <span className="font-bold"> {teamToDelete?.name} </span>
              e removerá todos os dados associados a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo para criar novo time */}
      <CreateTeamDialog 
        open={showCreateTeamDialog} 
        onOpenChange={setShowCreateTeamDialog} 
      />
    </div>
  );
} 