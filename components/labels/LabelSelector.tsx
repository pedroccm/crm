"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as LabelComponent } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, Plus, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label, getLabels, createLabel, DEFAULT_LABEL_COLORS } from "@/lib/supabase"
import { useTeam } from "@/lib/team-context"
import { toast } from "sonner"
import { LabelBadge } from "./LabelBadge"

interface LabelSelectorProps {
  selectedLabels: Label[]
  onLabelsChange: (labels: Label[]) => void
  className?: string
  placeholder?: string
  allowCreate?: boolean
  maxLabels?: number
}

export function LabelSelector({ 
  selectedLabels, 
  onLabelsChange, 
  className,
  placeholder = "Adicionar labels...",
  allowCreate = true,
  maxLabels = 10
}: LabelSelectorProps) {
  const { currentTeam } = useTeam()
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [createMode, setCreateMode] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_LABEL_COLORS[0])

  // Carregar labels disponíveis
  useEffect(() => {
    if (currentTeam?.id) {
      loadLabels()
    }
  }, [currentTeam?.id])

  async function loadLabels() {
    try {
      setLoading(true)
      const labels = await getLabels(currentTeam!.id)
      setAvailableLabels(labels)
    } catch (error) {
      console.error('Erro ao carregar labels:', error)
      toast.error('Erro ao carregar labels')
    } finally {
      setLoading(false)
    }
  }

  function toggleLabel(label: Label) {
    const isSelected = selectedLabels.some(l => l.id === label.id)
    
    if (isSelected) {
      // Remover label
      onLabelsChange(selectedLabels.filter(l => l.id !== label.id))
    } else {
      // Adicionar label (respeitando limite)
      if (selectedLabels.length >= maxLabels) {
        toast.warning(`Máximo de ${maxLabels} labels por lead`)
        return
      }
      onLabelsChange([...selectedLabels, label])
    }
  }

  function removeLabel(labelId: string) {
    onLabelsChange(selectedLabels.filter(l => l.id !== labelId))
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim() || !currentTeam?.id) return

    try {
      const newLabel = await createLabel({
        team_id: currentTeam.id,
        name: newLabelName.trim(),
        color: newLabelColor,
        is_active: true
      })

      // Adicionar à lista de disponíveis
      setAvailableLabels([...availableLabels, newLabel])
      
      // Adicionar à seleção se não atingiu o limite
      if (selectedLabels.length < maxLabels) {
        onLabelsChange([...selectedLabels, newLabel])
      }

      // Reset form
      setNewLabelName("")
      setNewLabelColor(DEFAULT_LABEL_COLORS[0])
      setCreateMode(false)
      
      toast.success(`Label "${newLabel.name}" criada com sucesso`)
    } catch (error) {
      console.error('Erro ao criar label:', error)
      toast.error('Erro ao criar label')
    }
  }

  const unselectedLabels = availableLabels.filter(
    label => !selectedLabels.some(selected => selected.id === label.id)
  )

  return (
    <div className={cn("space-y-3", className)}>
      {/* Labels selecionadas */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map(label => (
            <LabelBadge
              key={label.id}
              label={label}
              size="default"
              removable
              onRemove={removeLabel}
            />
          ))}
        </div>
      )}

      {/* Seletor de labels */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-start text-muted-foreground",
              selectedLabels.length === 0 && "justify-start"
            )}
            disabled={selectedLabels.length >= maxLabels}
          >
            <Tag className="mr-2 h-4 w-4" />
            {selectedLabels.length >= maxLabels 
              ? `Máximo de ${maxLabels} labels atingido`
              : placeholder
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Buscar labels..." />
            <CommandList>
              <CommandEmpty>
                {allowCreate ? (
                  <div className="p-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhuma label encontrada
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setCreateMode(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar nova label
                    </Button>
                  </div>
                ) : (
                  "Nenhuma label encontrada"
                )}
              </CommandEmpty>
              
              {/* Modo de criação */}
              {createMode && (
                <div className="p-3 border-b">
                  <div className="space-y-3">
                    <div>
                      <LabelComponent htmlFor="label-name" className="text-sm font-medium">
                        Nome da Label
                      </LabelComponent>
                      <Input
                        id="label-name"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="Nome da nova label"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <LabelComponent className="text-sm font-medium mb-2">
                        Cor
                      </LabelComponent>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_LABEL_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              newLabelColor === color 
                                ? "border-gray-900 scale-110" 
                                : "border-gray-300 hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewLabelColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreateMode(false)
                          setNewLabelName("")
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateLabel}
                        disabled={!newLabelName.trim()}
                      >
                        Criar Label
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Lista de labels disponíveis */}
              {unselectedLabels.length > 0 && (
                <CommandGroup>
                  {unselectedLabels.map(label => {
                    const isSelected = selectedLabels.some(l => l.id === label.id)
                    return (
                      <CommandItem
                        key={label.id}
                        onSelect={() => toggleLabel(label)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: label.color }}
                          />
                          <span>{label.name}</span>
                          {label.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {label.description}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              
              {/* Botão para criar nova label */}
              {allowCreate && !createMode && unselectedLabels.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setCreateMode(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar nova label
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}