"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTeam } from "@/lib/team-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Building2 } from "lucide-react";

// Schema de validação para o formulário
const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do time deve ter pelo menos 2 caracteres.",
  }),
  slug: z.string().min(2, {
    message: "O slug deve ter pelo menos 2 caracteres.",
  }).regex(/^[a-z0-9-]+$/, {
    message: "O slug deve conter apenas letras minúsculas, números e hífens.",
  }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const { createTeam, fetchTeams } = useTeam();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Inicializar o formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  // Função para gerar o slug a partir do nome
  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    
    form.setValue("slug", slug);
    return slug;
  };

  // Função para lidar com o envio do formulário
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    console.log("Iniciando criação do time com valores:", values);
    
    try {
      console.log("Chamando createTeam com:", {
        name: values.name,
        slug: values.slug,
        description: values.description,
      });
      
      const team = await createTeam({
        name: values.name,
        slug: values.slug,
        description: values.description,
      });
      
      console.log("Resultado da criação do time:", team);
      
      if (team) {
        toast.success("Time criado com sucesso!");
        console.log("Chamando fetchTeams para atualizar a lista");
        await fetchTeams();
        form.reset();
        onOpenChange(false);
        router.push("/dashboard");
      } else {
        console.error("Falha ao criar time: resultado nulo");
        toast.error("Erro ao criar time");
      }
    } catch (error) {
      console.error("Erro ao criar time:", error);
      toast.error(`Erro ao criar time: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Time</DialogTitle>
          <DialogDescription>
            Crie um novo time para gerenciar seus leads, empresas e pipelines.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Time</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Meu Time" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("slug")) {
                          generateSlug(e.target.value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Este é o nome que será exibido para o seu time.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug do Time</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="mr-2 text-muted-foreground">@</span>
                      <Input placeholder="meu-time" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    O slug é usado para identificar seu time em URLs e APIs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o propósito do seu time" 
                      {...field} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Criando..."
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Criar Time
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 