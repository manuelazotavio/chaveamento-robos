import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { timeService } from "@/services/timeService";
import type { EnumTime } from "@/types/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const tipoLabel: Record<EnumTime, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
};

export default function Times() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<EnumTime | "">("");
  const [erro, setErro] = useState<string | null>(null);

  const { data: times, isLoading, isError, refetch } = useQuery({
    queryKey: ["times"],
    queryFn: timeService.listar,
  });

  // api não tem paginação nem PUT/DELETE ainda, então por enquanto é só listar + cadastrar
  const criarTime = useMutation({
    mutationFn: timeService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["times"] });
      toast.success("Time cadastrado com sucesso.");
      setOpen(false);
      setNome("");
      setTipo("");
    },
    onError: () => {
      toast.error("Não foi possível cadastrar o time.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !tipo) {
      setErro("Preencha o nome e a categoria do time.");
      return;
    }
    setErro(null);
    criarTime.mutate({ nome: nome.trim(), tipo });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Times</h1>
          <p className="text-sm text-muted-foreground">Equipes inscritas no torneio.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Novo time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Novo time</DialogTitle>
                <DialogDescription>Cadastre uma equipe para o torneio.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do time</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: IFSP Robotics"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Categoria</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as EnumTime)}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROBOCODE">RoboCode</SelectItem>
                      <SelectItem value="ROBOSOCCER">RoboSoccer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {erro && <p className="text-sm text-destructive">{erro}</p>}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={criarTime.isPending}>
                  {criarTime.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="p-6">
              <ErrorState onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : times && times.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {times.map((time) => (
                  <TableRow key={time.id}>
                    <TableCell className="text-muted-foreground">#{time.id}</TableCell>
                    <TableCell className="font-medium">{time.nome}</TableCell>
                    <TableCell>{tipoLabel[time.tipo]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Users className="h-8 w-8" />
              <p className="text-sm">Nenhum time cadastrado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
