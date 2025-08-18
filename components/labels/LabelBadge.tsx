"use client"

import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/lib/supabase"

interface LabelBadgeProps {
  label: Label
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline"
  removable?: boolean
  onRemove?: (labelId: string) => void
  className?: string
}

export function LabelBadge({ 
  label, 
  size = "default", 
  variant = "default",
  removable = false, 
  onRemove,
  className 
}: LabelBadgeProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRemove && label.id) {
      onRemove(label.id)
    }
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex items-center gap-1 text-white border-0 font-medium",
        size === "sm" && "text-xs px-2 py-0.5",
        size === "default" && "text-sm px-2.5 py-1",
        size === "lg" && "text-base px-3 py-1.5",
        className
      )}
      style={{ 
        backgroundColor: label.color,
        color: getContrastColor(label.color)
      }}
      title={label.description}
    >
      <span className="truncate max-w-[120px]">{label.name}</span>
      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className={cn(
            "ml-1 rounded-full hover:bg-black/20 transition-colors",
            size === "sm" && "p-0.5",
            size === "default" && "p-1",
            size === "lg" && "p-1.5"
          )}
          title={`Remover label ${label.name}`}
        >
          <X className={cn(
            size === "sm" && "h-3 w-3",
            size === "default" && "h-3 w-3",
            size === "lg" && "h-4 w-4"
          )} />
        </button>
      )}
    </Badge>
  )
}

// Utilitário para determinar a cor do texto baseada na cor de fundo
function getContrastColor(hexColor: string): string {
  // Remove o # se presente
  const color = hexColor.replace('#', '')
  
  // Converte para RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  // Calcula a luminância
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Retorna branco para cores escuras e preto para cores claras
  return luminance > 0.5 ? '#000000' : '#ffffff'
}