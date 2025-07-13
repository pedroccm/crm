"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface Team {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "guest";
  created_at?: string;
  updated_at?: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: "admin" | "member" | "guest";
  invited_by: string;
  token: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  members: TeamMember[];
  invitations: TeamInvitation[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isTeamAdmin: boolean;
  needsTeam: boolean;
  setCurrentTeam: (team: Team | null) => void;
  fetchTeams: () => Promise<Team[]>;
  fetchTeamMembers: (teamId: string) => Promise<TeamMember[]>;
  fetchTeamInvitations: (teamId: string) => Promise<TeamInvitation[]>;
  createTeam: (team: Partial<Team>) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  inviteMember: (teamId: string, email: string, role: "admin" | "member" | "guest") => Promise<TeamInvitation | null>;
  updateMemberRole: (memberId: string, role: "admin" | "member" | "guest") => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  deleteInvitation: (invitationId: string) => Promise<boolean>;
  acceptInvitation: (token: string) => Promise<boolean>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [needsTeam, setNeedsTeam] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Carregar times do usuário ao inicializar
  useEffect(() => {
    console.log("TeamProvider: useEffect executado, user:", user?.id);
    
    if (user) {
      console.log("TeamProvider: usuário autenticado, carregando times...");
      fetchTeams().catch(err => {
        console.error("TeamProvider: erro ao carregar times:", err);
      });
      
      checkSuperAdmin().catch(err => {
        console.error("TeamProvider: erro ao verificar super admin:", err);
      });
    } else {
      console.log("TeamProvider: usuário não autenticado");
    }
  }, [user]);

  // Verificar se o usuário é super admin
  const checkSuperAdmin = async () => {
    if (!user) {
      console.log("TeamProvider: checkSuperAdmin - usuário não autenticado");
      return;
    }

    try {
      console.log("TeamProvider: verificando se o usuário é super admin...");
      
      // Primeiro, verificar se o perfil existe
      const { data: profileExists, error: profileError } = await supabase
        .from("profiles")
        .select("id, is_super_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("TeamProvider: erro ao verificar perfil:", profileError);
        setIsSuperAdmin(false);
        return;
      }

      console.log("TeamProvider: perfil encontrado:", profileExists);

      // Se o perfil não existir, criar um
      if (!profileExists) {
        console.log("TeamProvider: perfil não encontrado, criando novo perfil...");
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            is_super_admin: false
          });

        if (insertError) {
          console.error("TeamProvider: erro ao criar perfil:", insertError);
          setIsSuperAdmin(false);
        } else {
          console.log("TeamProvider: perfil criado com sucesso");
          setIsSuperAdmin(false);
        }
      } else {
        // Verificar se o usuário é super admin
        console.log("TeamProvider: verificando flag is_super_admin:", profileExists.is_super_admin);
        setIsSuperAdmin(!!profileExists.is_super_admin);
      }
    } catch (error) {
      console.error("TeamProvider: erro ao verificar super admin:", error);
      setIsSuperAdmin(false);
    }
  };

  // Verificar se o usuário é admin do time atual
  useEffect(() => {
    if (user && currentTeam) {
      checkTeamAdmin();
    } else {
      setIsTeamAdmin(false);
    }
  }, [user, currentTeam]);

  const checkTeamAdmin = async () => {
    if (!user || !currentTeam) return;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", currentTeam.id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      setIsTeamAdmin(data.role === "owner" || data.role === "admin");
    } catch (error) {
      console.error("Erro ao verificar admin do time:", error);
      setIsTeamAdmin(false);
    }
  };

  // Carregar time salvo no localStorage
  useEffect(() => {
    const savedTeam = localStorage.getItem("currentTeam");
    if (savedTeam) {
      try {
        const team = JSON.parse(savedTeam);
        setCurrentTeam(team);
      } catch (error) {
        console.error("Erro ao carregar time do localStorage:", error);
        localStorage.removeItem("currentTeam");
      }
    }
  }, []);

  // Salvar time atual no localStorage quando mudar
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem("currentTeam", JSON.stringify(currentTeam));
    } else {
      localStorage.removeItem("currentTeam");
    }
  }, [currentTeam]);

  // Verificar se o usuário tem um time
  useEffect(() => {
    if (user && teams.length === 0 && !isLoading) {
      setNeedsTeam(true);
      
      // Verificar se estamos no modo debug
      const isDebugMode = typeof window !== 'undefined' && localStorage.getItem("debug_mode") === "true";
      
      // Não redirecionar se já estiver na página de criação de time, for super admin ou estiver no modo debug
      const isTeamCreationPage = window.location.pathname.includes('/configuracoes/time') || 
                                window.location.pathname.includes('/admin/times');
      
      if (!isTeamCreationPage && !isSuperAdmin && !isDebugMode) {
        router.push('/configuracoes/time');
      }
    } else {
      setNeedsTeam(false);
    }
  }, [user, teams, isLoading, isSuperAdmin, router]);

  // Buscar times do usuário
  const fetchTeams = async (): Promise<Team[]> => {
    if (!user) {
      console.log("fetchTeams: usuário não autenticado, retornando array vazio");
      return [];
    }
    
    setIsLoading(true);
    console.log("fetchTeams: iniciando busca de times para o usuário:", user.id);
    
    try {
      // Buscar times dos quais o usuário é membro
      const { data: memberTeams, error: memberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (memberError) {
        console.error("fetchTeams: erro ao buscar times do usuário:", memberError);
        throw memberError;
      }

      console.log("fetchTeams: times encontrados:", memberTeams);
      const teamIds = memberTeams.map(member => member.team_id);
      
      if (teamIds.length === 0) {
        console.log("fetchTeams: usuário não é membro de nenhum time");
        setTeams([]);
        setIsLoading(false);
        return [];
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      if (teamsError) {
        console.error("fetchTeams: erro ao buscar detalhes dos times:", teamsError);
        throw teamsError;
      }

      console.log("fetchTeams: detalhes dos times carregados:", teamsData);
      setTeams(teamsData);
      
      // Se não houver time atual selecionado, selecionar o primeiro
      if (!currentTeam && teamsData.length > 0) {
        console.log("fetchTeams: selecionando o primeiro time como atual:", teamsData[0]);
        setCurrentTeam(teamsData[0]);
        
        // Carregar membros do time selecionado
        fetchTeamMembers(teamsData[0].id).catch(err => {
          console.error("fetchTeams: erro ao carregar membros do time:", err);
        });
      }
      
      setIsLoading(false);
      return teamsData;
    } catch (error) {
      console.error("Erro ao buscar times:", error);
      setIsLoading(false);
      return [];
    }
  };

  // Buscar membros de um time
  const fetchTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq("team_id", teamId);

      if (error) throw error;

      setMembers(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar membros do time:", error);
      return [];
    }
  };

  // Buscar convites de um time
  const fetchTeamInvitations = async (teamId: string): Promise<TeamInvitation[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("team_id", teamId);

      if (error) throw error;

      setInvitations(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar convites do time:", error);
      return [];
    }
  };

  // Criar um novo time
  const createTeam = async (team: Partial<Team>): Promise<Team | null> => {
    console.log("createTeam chamado com:", team);
    
    if (!user) {
      console.error("createTeam: usuário não autenticado");
      toast.error("Você precisa estar autenticado para criar um time");
      return null;
    }

    try {
      // Verificar perfil do usuário
      console.log("Verificando perfil do usuário:", user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erro ao verificar perfil do usuário:", profileError);
        
        // Se o perfil não existir, criar um
        if (profileError.code === "PGRST116") {
          console.log("Perfil não encontrado, criando novo perfil");
          
          const { data: newProfile, error: createProfileError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
              is_super_admin: false
            })
            .select()
            .single();
            
          if (createProfileError) {
            console.error("Erro ao criar perfil:", createProfileError);
            toast.error("Erro ao criar perfil de usuário");
            return null;
          }
          
          console.log("Perfil criado com sucesso:", newProfile);
        } else {
          toast.error("Erro ao verificar perfil de usuário");
          return null;
        }
      } else {
        console.log("Perfil do usuário encontrado:", profile);
      }

      // Gerar slug a partir do nome se não fornecido
      let slug = team.slug || '';
      if (!slug && team.name) {
        slug = team.name.toLowerCase().replace(/\s+/g, '-');
      }
      
      // Verificar se o slug já existe
      console.log("Slug base gerado:", slug);
      let slugExists = true;
      let slugCounter = 0;
      let uniqueSlug = slug;
      
      // Tentar até 100 vezes para evitar loop infinito
      while (slugExists && slugCounter < 100) {
        const { data, error } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", uniqueSlug)
          .maybeSingle();
          
        if (error) {
          console.error("Erro ao verificar slug:", error);
          break;
        }
        
        if (!data) {
          slugExists = false;
        } else {
          slugCounter++;
          uniqueSlug = `${slug}-${slugCounter}`;
        }
      }
      
      console.log("Slug único gerado:", uniqueSlug);

      // Inserir time na tabela teams
      console.log("Inserindo time na tabela teams:", {
        name: team.name,
        slug: uniqueSlug,
        description: team.description || '',
        created_by: user.id
      });
      
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: team.name,
          slug: uniqueSlug,
          description: team.description || '',
          created_by: user.id
        })
        .select()
        .single();

      if (teamError) {
        console.error("Erro ao criar time:", teamError);
        toast.error("Erro ao criar time");
        return null;
      }

      console.log("Time criado com sucesso:", newTeam);

      // Adicionar criador como owner do time
      console.log("Adicionando criador como owner do time:", {
        team_id: newTeam.id,
        user_id: user.id,
        role: 'owner'
      });
      
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        console.error("Erro ao adicionar membro ao time:", memberError);
        console.error("Detalhes do erro:", memberError);
        toast.error("Erro ao adicionar você como membro do time");
        return null;
      }

      // Atualizar lista de times
      const updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);
      setCurrentTeam(newTeam);
      
      toast.success("Time criado com sucesso!");
      return newTeam;
    } catch (error) {
      console.error("Erro ao criar time:", error);
      console.error("Detalhes do erro:", error);
      toast.error("Erro ao criar time");
      return null;
    }
  };

  // Atualizar um time
  const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<Team | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", teamId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar a lista de times
      const updatedTeams = teams.map(team => 
        team.id === teamId ? { ...team, ...updates } : team
      );
      setTeams(updatedTeams);
      
      // Atualizar o time atual se for o mesmo
      if (currentTeam && currentTeam.id === teamId) {
        setCurrentTeam({ ...currentTeam, ...updates });
      }
      
      toast.success("Time atualizado com sucesso!");
      return data;
    } catch (error: any) {
      console.error("Erro ao atualizar time:", error);
      toast.error(`Erro ao atualizar time: ${error.message}`);
      return null;
    }
  };

  // Excluir um time
  const deleteTeam = async (teamId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      // Atualizar a lista de times
      const updatedTeams = teams.filter(team => team.id !== teamId);
      setTeams(updatedTeams);
      
      // Se o time atual for o excluído, selecionar outro
      if (currentTeam && currentTeam.id === teamId) {
        setCurrentTeam(updatedTeams.length > 0 ? updatedTeams[0] : null);
      }
      
      toast.success("Time excluído com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir time:", error);
      toast.error(`Erro ao excluir time: ${error.message}`);
      return false;
    }
  };

  // Convidar um membro para o time
  const inviteMember = async (
    teamId: string, 
    email: string, 
    role: "admin" | "member" | "guest"
  ): Promise<TeamInvitation | null> => {
    if (!user) return null;
    
    try {
      // Gerar token único
      const token = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
      
      // Definir data de expiração (7 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const { data, error } = await supabase
        .from("team_invitations")
        .insert({
          team_id: teamId,
          email,
          role,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar a lista de convites
      await fetchTeamInvitations(teamId);
      
      toast.success(`Convite enviado para ${email}`);
      return data;
    } catch (error: any) {
      console.error("Erro ao convidar membro:", error);
      toast.error(`Erro ao convidar membro: ${error.message}`);
      return null;
    }
  };

  // Atualizar função de um membro
  const updateMemberRole = async (memberId: string, role: "admin" | "member" | "guest"): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;

      // Atualizar a lista de membros
      const updatedMembers = members.map(member => 
        member.id === memberId ? { ...member, role } : member
      );
      setMembers(updatedMembers);
      
      toast.success("Função do membro atualizada com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Erro ao atualizar função do membro:", error);
      toast.error(`Erro ao atualizar função do membro: ${error.message}`);
      return false;
    }
  };

  // Remover um membro do time
  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Atualizar a lista de membros
      const updatedMembers = members.filter(member => member.id !== memberId);
      setMembers(updatedMembers);
      
      toast.success("Membro removido com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      toast.error(`Erro ao remover membro: ${error.message}`);
      return false;
    }
  };

  // Excluir um convite
  const deleteInvitation = async (invitationId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      // Atualizar a lista de convites
      const updatedInvitations = invitations.filter(invitation => invitation.id !== invitationId);
      setInvitations(updatedInvitations);
      
      toast.success("Convite excluído com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir convite:", error);
      toast.error(`Erro ao excluir convite: ${error.message}`);
      return false;
    }
  };

  // Aceitar um convite
  const acceptInvitation = async (token: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Buscar o convite pelo token
      const { data: invitation, error: invitationError } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (invitationError) throw invitationError;

      // Verificar se o convite expirou
      if (new Date(invitation.expires_at) < new Date()) {
        toast.error("Este convite expirou.");
        return false;
      }

      // Verificar se o email do convite corresponde ao do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.email !== invitation.email) {
        toast.error("Este convite não é para você.");
        return false;
      }

      // Adicionar o usuário como membro do time
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role
        });

      if (memberError) throw memberError;

      // Excluir o convite
      const { error: deleteError } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitation.id);

      if (deleteError) throw deleteError;

      // Atualizar a lista de times
      await fetchTeams();
      
      toast.success("Convite aceito com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Erro ao aceitar convite:", error);
      toast.error(`Erro ao aceitar convite: ${error.message}`);
      return false;
    }
  };

  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        teams,
        members,
        invitations,
        isLoading,
        isSuperAdmin,
        isTeamAdmin,
        needsTeam,
        setCurrentTeam,
        fetchTeams,
        fetchTeamMembers,
        fetchTeamInvitations,
        createTeam,
        updateTeam,
        deleteTeam,
        inviteMember,
        updateMemberRole,
        removeMember,
        deleteInvitation,
        acceptInvitation
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam deve ser usado dentro de um TeamProvider");
  }
  return context;
} 