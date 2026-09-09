import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { torneioService } from "@/services/torneioService";
import type { EnumTorneio, StatusTorneio } from "@/types/torneio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const tipoLabel: Record<EnumTorneio, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
};

const statusLabel: Record<StatusTorneio, string> = {
  INSCRICOES: "Inscrições abertas",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADO: "Finalizado",
};

export default function Torneios() {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<EnumTorneio | "">("");
  const [erro, setErro] = useState<string | null>(null);

  const { data: torneios, isLoading, isError, refetch } = useQuery({
    queryKey: ["torneios"],
    queryFn: torneioService.listar,
  });

  // só existem duas categorias possíveis — depois que um torneio de cada já existir,
  // não faz sentido permitir criar outro igual (evita duplicidade)
  const tiposExistentes = useMemo(
    () => new Set(torneios?.map((t) => t.tipo) ?? []),
    [torneios]
  );
  const todasCategoriasCriadas = tiposExistentes.size >= Object.keys(tipoLabel).length;

  const criarTorneio = useMutation({
    mutationFn: torneioService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torneios"] });
      toast.success("Torneio criado com sucesso.");
      setOpen(false);
      setTipo("");
    },
    onError: () => {
      toast.error("Não foi possível criar o torneio.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tipo) {
      setErro("Selecione a categoria do torneio.");
      return;
    }
    setErro(null);
    criarTorneio.mutate({ tipo });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Torneios</h1>
          <p className="text-sm text-muted-foreground">
            Torneios abertos — times são inscritos automaticamente ao serem cadastrados na categoria correspondente.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={todasCategoriasCriadas} title={todasCategoriasCriadas ? "Todas as categorias já têm um torneio criado" : undefined}>
                <Plus className="h-4 w-4" />
                Novo torneio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Novo torneio</DialogTitle>
                  <DialogDescription>Abre um torneio para inscrição de times.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo-torneio">Categoria</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as EnumTorneio)}>
                      <SelectTrigger id="tipo-torneio">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(tipoLabel) as EnumTorneio[]).map((valor) => (
                          <SelectItem key={valor} value={valor} disabled={tiposExistentes.has(valor)}>
                            {tipoLabel[valor]}
                            {tiposExistentes.has(valor) ? " (já criado)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {erro && <p className="text-sm text-destructive">{erro}</p>}
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={criarTorneio.isPending}>
                    {criarTorneio.isPending ? "Criando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {todasCategoriasCriadas && (
            <p className="text-xs text-muted-foreground">Já existe um torneio de cada categoria.</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="p-6">
              <ErrorState onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : torneios && torneios.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {torneios.map((torneio) => (
                  <TableRow key={torneio.id}>
                    <TableCell className="text-muted-foreground">#{torneio.id}</TableCell>
                    <TableCell className="font-medium">{tipoLabel[torneio.tipo]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {torneio.status ? statusLabel[torneio.status] : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Trophy className="h-8 w-8" />
              <p className="text-sm">Nenhum torneio criado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
