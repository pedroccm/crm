"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeam, TeamMember, TeamInvitation } from "@/lib/team-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Check, 
  Copy, 
  Edit, 
  MoreHorizontal, 
  Plus, 
  Save, 
  Trash, 
  UserMinus, 
  X 
} from "lucide-react";
import { CreateTeamDialog } from "@/components/create-team-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Users, Building2, Settings } from "lucide-react";

export default function TeamSettingsPage() {
  const router = useRouter();
  const { 
    currentTeam, 
    teams, 
    members, 
    invitations, 
    isLoading, 
    needsTeam,
    fetchTeams, 
    fetchTeamMembers, 
    fetchTeamInvitations, 
    updateTeam, 
    deleteTeam, 
    inviteMember, 
    updateMemberRole, 
    removeMember, 
    deleteInvitation 
  } = useTeam();
  
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  
  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name || "");
      setTeamDescription(currentTeam.description || "");
      setTeamSlug(currentTeam.slug || "");
    }
  }, [currentTeam]);
  
  useEffect(() => {
    if (needsTeam) {
      setIsCreateTeamOpen(true);
    }
  }, [needsTeam]);
  
  useEffect(() => {
    if (currentTeam) {
      fetchTeamMembers(currentTeam.id);
      fetchTeamInvitations(currentTeam.id);
    }
  }, [currentTeam, fetchTeamMembers, fetchTeamInvitations]);
  
  const loadData = async () => {
    if (currentTeam) {
      await Promise.all([
        fetchTeamMembers(currentTeam.id),
        fetchTeamInvitations(currentTeam.id)
      ]);
    }
  };
  
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const saveTeamChanges = async () => {
    if (!currentTeam) return;
    
    try {
      await updateTeam(currentTeam.id, {
        name: teamName,
        description: teamDescription,
        slug: teamSlug
      });
      
      toast.success("Time atualizado com sucesso!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar o time");
      console.error(error);
    }
  };
  
  const confirmDeleteTeam = async () => {
    if (!currentTeam) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteTeam(currentTeam.id);
      if (success) {
        toast.success("Time excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir o time");
      }
    } catch (error) {
      toast.error("Erro ao excluir o time");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const sendInvitation = async () => {
    if (!currentTeam || !inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      const invitation = await inviteMember(
        currentTeam.id,
        inviteEmail.trim(),
        inviteRole as "admin" | "member" | "guest"
      );
      
      if (invitation) {
        toast.success(`Convite enviado para ${inviteEmail}`);
        setInviteEmail("");
        loadData();
      } else {
        toast.error("Erro ao enviar convite");
      }
    } catch (error) {
      toast.error("Erro ao enviar convite");
      console.error(error);
    } finally {
      setIsInviting(false);
    }
  };
  
  const changeRole = async (memberId: string, role: "admin" | "member" | "guest") => {
    try {
      const success = await updateMemberRole(memberId, role);
      if (success) {
        toast.success("Função atualizada com sucesso!");
        loadData();
      } else {
        toast.error("Erro ao atualizar função");
      }
    } catch (error) {
      toast.error("Erro ao atualizar função");
      console.error(error);
    }
  };
  
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      const success = await removeMember(memberToRemove);
      if (success) {
        toast.success("Membro removido com sucesso!");
        setMemberToRemove(null);
        loadData();
      } else {
        toast.error("Erro ao remover membro");
      }
    } catch (error) {
      toast.error("Erro ao remover membro");
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };
  
  const cancelInvitation = async (invitationId: string) => {
    try {
      const success = await deleteInvitation(invitationId);
      if (success) {
        toast.success("Convite cancelado com sucesso!");
        loadData();
      } else {
        toast.error("Erro ao cancelar convite");
      }
    } catch (error) {
      toast.error("Erro ao cancelar convite");
      console.error(error);
    }
  };
  
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de convite copiado!");
  };
  
  if (needsTeam || teams.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Building2 className="h-16 w-16 mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Bem-vindo ao Gaia CRM</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Para começar a usar o sistema, você precisa criar ou participar de um time.
            Um time é um espaço isolado onde você pode gerenciar leads, empresas e pipelines.
          </p>
          
          <div className="flex flex-col gap-4 w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Criar um novo time</CardTitle>
                <CardDescription>
                  Crie seu próprio time para gerenciar seus leads e empresas
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => setIsCreateTeamOpen(true)}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Criar time
                </Button>
              </CardFooter>
            </Card>
            
            <p className="text-sm text-muted-foreground">
              Se você foi convidado para um time, verifique o link de convite em seu email.
            </p>
          </div>
        </div>
        
        <CreateTeamDialog 
          open={isCreateTeamOpen} 
          onOpenChange={setIsCreateTeamOpen} 
        />
      </div>
    );
  }
  
  if (isLoading || !currentTeam) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center min-h-[60vh]">
          <p>Carregando configurações do time...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Time</h1>
          <p className="text-muted-foreground">Gerencie as configurações do seu time e membros</p>
        </div>
        <CreateTeamDialog 
          open={isCreateTeamOpen} 
          onOpenChange={setIsCreateTeamOpen} 
        />
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-8">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Membros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Informações do Time</CardTitle>
                  <CardDescription>
                    Gerencie as informações básicas do seu time
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button onClick={saveTeamChanges}>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="team-name">Nome do Time</Label>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="team-slug">Slug do Time</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      id="team-slug"
                      value={teamSlug}
                      onChange={(e) => setTeamSlug(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O slug é usado para identificar seu time em URLs e APIs
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="team-description">Descrição</Label>
                  <Textarea
                    id="team-description"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam todo o time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Time
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o time
                      <strong> {currentTeam.name}</strong> e removerá todos os dados associados
                      a ele, incluindo leads, empresas e pipelines.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmDeleteTeam}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Excluindo..." : "Sim, excluir time"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Membros do Time</CardTitle>
                  <CardDescription>
                    Gerencie os membros do seu time e suas permissões
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convidar Membro</DialogTitle>
                      <DialogDescription>
                        Envie um convite por email para adicionar um novo membro ao time
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="email@exemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="invite-role">Função</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={setInviteRole}
                        >
                          <SelectTrigger id="invite-role">
                            <SelectValue placeholder="Selecione uma função" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="guest">Convidado</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Administradores podem gerenciar membros e configurações do time.
                          Membros podem acessar todos os recursos.
                          Convidados têm acesso limitado.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={sendInvitation}
                        disabled={isInviting || !inviteEmail.trim()}
                      >
                        {isInviting ? "Enviando..." : "Enviar Convite"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Membros Atuais</h3>
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(member.profiles?.name || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                        </div>
                        <Badge variant={
                          member.role === "owner" ? "default" :
                          member.role === "admin" ? "secondary" : "outline"
                        }>
                          {member.role === "owner" ? "Proprietário" :
                           member.role === "admin" ? "Administrador" :
                           member.role === "member" ? "Membro" : "Convidado"}
                        </Badge>
                      </div>
                      {member.role !== "owner" && (
                        <div className="flex items-center gap-2">
                          <Select
                            defaultValue={member.role}
                            onValueChange={(value) => 
                              changeRole(member.id, value as "admin" | "member" | "guest")
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="member">Membro</SelectItem>
                              <SelectItem value="guest">Convidado</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover membro</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {member.profiles?.name} do time?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setMemberToRemove(member.id)
                                    confirmRemoveMember()
                                  }}
                                  disabled={isRemoving}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isRemoving && memberToRemove === member.id
                                    ? "Removendo..."
                                    : "Sim, remover"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {invitations.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium mt-8">Convites Pendentes</h3>
                    <div className="divide-y">
                      {invitations.map((invitation) => (
                        <div key={invitation.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(invitation.email.split("@")[0])}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Expira em {new Date(invitation.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {invitation.role === "admin" ? "Administrador" :
                               invitation.role === "member" ? "Membro" : "Convidado"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInviteLink(invitation.token)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelInvitation(invitation.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 