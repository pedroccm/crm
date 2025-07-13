"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Check, 
  ChevronsUpDown, 
  PlusCircle, 
  Settings, 
  Users 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam, Team } from "@/lib/team-context";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateTeamDialog } from "./create-team-dialog";

export function TeamSelector() {
  const router = useRouter();
  const { currentTeam, teams, setCurrentTeam, isLoading, isSuperAdmin } = useTeam();
  const [open, setOpen] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);

  // Função para obter as iniciais do nome do time
  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para selecionar um time
  const selectTeam = (team: Team) => {
    setCurrentTeam(team);
    setOpen(false);
  };

  // Função para navegar para as configurações do time
  const goToTeamSettings = () => {
    router.push("/configuracoes/time");
    setOpen(false);
  };

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-start">
        <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse mr-2" />
        <span className="w-24 h-4 bg-gray-200 animate-pulse rounded" />
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Selecione um time"
            className="w-[200px] justify-between"
          >
            {currentTeam ? (
              <div className="flex items-center">
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarImage 
                    src={currentTeam.logo_url || ""} 
                    alt={currentTeam.name} 
                  />
                  <AvatarFallback className="text-xs">
                    {getTeamInitials(currentTeam.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{currentTeam.name}</span>
              </div>
            ) : (
              <span>Selecione um time</span>
            )}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Buscar time..." />
              <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
              {teams.length > 0 && (
                <CommandGroup heading="Seus times">
                  {teams.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() => selectTeam(team)}
                      className="text-sm"
                    >
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage 
                          src={team.logo_url || ""} 
                          alt={team.name} 
                        />
                        <AvatarFallback className="text-xs">
                          {getTeamInitials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{team.name}</span>
                      {currentTeam?.id === team.id && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowCreateTeamDialog(true);
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Criar novo time</span>
                </CommandItem>
                {currentTeam && (
                  <CommandItem onSelect={goToTeamSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações do time</span>
                  </CommandItem>
                )}
                {isSuperAdmin && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/admin/times");
                      setOpen(false);
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gerenciar todos os times</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateTeamDialog 
        open={showCreateTeamDialog} 
        onOpenChange={setShowCreateTeamDialog} 
      />
    </>
  );
} 