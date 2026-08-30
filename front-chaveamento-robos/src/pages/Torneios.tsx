import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trophy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { torneioService } from "@/services/torneioService";
import { timeService } from "@/services/timeService";
import type { EnumTorneio, StatusTorneio, Torneio } from "@/types/torneio";
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

  const [torneioParaInscrever, setTorneioParaInscrever] = useState<Torneio | null>(null);
  const [timeId, setTimeId] = useState<number | "">("");

  const { data: torneios, isLoading, isError, refetch } = useQuery({
    queryKey: ["torneios"],
    queryFn: torneioService.listar,
  });

  const { data: times } = useQuery({
    queryKey: ["times"],
    queryFn: timeService.listar,
  });

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

  // a api não expõe quem já tá inscrito num torneio, só o post pra inscrever — então
  // não dá pra listar os times de cada torneio aqui, só oferecer a ação de inscrever
  const inscreverTime = useMutation({
    mutationFn: () => torneioService.inscreverTime(torneioParaInscrever!.id, timeId as number),
    onSuccess: () => {
      toast.success("Time inscrito no torneio.");
      setTorneioParaInscrever(null);
      setTimeId("");
    },
    onError: () => {
      toast.error("Não foi possível inscrever o time — confira se ele já não está inscrito.");
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

  function handleInscrever(e: FormEvent) {
    e.preventDefault();
    if (!timeId) return;
    inscreverTime.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Torneios</h1>
          <p className="text-sm text-muted-foreground">Torneios abertos e inscrição de times.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
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
                      <SelectItem value="ROBOCODE">RoboCode</SelectItem>
                      <SelectItem value="ROBOSOCCER">RoboSoccer</SelectItem>
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
                  <TableHead className="w-32" />
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
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTorneioParaInscrever(torneio)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Inscrever
                      </Button>
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

      <Dialog
        open={!!torneioParaInscrever}
        onOpenChange={(v) => {
          if (!v) {
            setTorneioParaInscrever(null);
            setTimeId("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleInscrever}>
            <DialogHeader>
              <DialogTitle>Inscrever time</DialogTitle>
              <DialogDescription>
                {torneioParaInscrever &&
                  `Torneio #${torneioParaInscrever.id} — ${tipoLabel[torneioParaInscrever.tipo]}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="time-inscricao">Time</Label>
              <Select value={timeId ? String(timeId) : ""} onValueChange={(v) => setTimeId(Number(v))}>
                <SelectTrigger id="time-inscricao">
                  <SelectValue placeholder="Selecione um time" />
                </SelectTrigger>
                <SelectContent>
                  {times?.map((time) => (
                    <SelectItem key={time.id} value={String(time.id)}>
                      {time.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {times && times.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum time cadastrado ainda — cadastre um na aba Times primeiro.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={!timeId || inscreverTime.isPending}>
                {inscreverTime.isPending ? "Inscrevendo..." : "Inscrever"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
