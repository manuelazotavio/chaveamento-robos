import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Trophy, Users, X } from "lucide-react";
import { toast } from "sonner";
import { timeService } from "@/services/timeService";
import { torneioService } from "@/services/torneioService";
import { API_BASE_URL } from "@/services/api";
import { useAuth } from "@/lib/auth";
import type { EnumTime, StatusTime, Time } from "@/types/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { TimeCadastroForm } from "@/components/TimeCadastroForm";
import { TimeAudioRevisao } from "@/components/TimeAudioRevisao";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tipoLabel: Record<EnumTime, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
};

const statusLabel: Record<StatusTime, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const statusVariant: Record<StatusTime, "warning" | "default" | "destructive"> = {
  PENDENTE: "warning",
  APROVADO: "default",
  REJEITADO: "destructive",
};

export default function Times() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [timeDetalheId, setTimeDetalheId] = useState<number | null>(null);
  const [filtroTorneioId, setFiltroTorneioId] = useState<number | "todos">("todos");

  const {
    data: timeDetalhe,
    isLoading: carregandoDetalhe,
    isError: erroDetalhe,
  } = useQuery({
    queryKey: ["time", timeDetalheId],
    queryFn: () => timeService.detalhar(timeDetalheId as number),
    enabled: timeDetalheId !== null,
  });

  const { data: times, isLoading, isError, refetch } = useQuery({
    queryKey: ["times"],
    queryFn: timeService.listar,
  });

  const { data: torneios } = useQuery({
    queryKey: ["torneios"],
    queryFn: torneioService.listar,
  });

  const {
    data: timesDoTorneio,
    isLoading: carregandoFiltro,
    isError: erroFiltro,
    refetch: refetchFiltro,
  } = useQuery({
    queryKey: ["torneio-times", filtroTorneioId],
    queryFn: () => torneioService.listarTimes(filtroTorneioId as number),
    enabled: filtroTorneioId !== "todos",
  });

  const timesExibidos = filtroTorneioId === "todos" ? times : timesDoTorneio;
  const carregandoExibidos = filtroTorneioId === "todos" ? isLoading : carregandoFiltro;
  const erroExibidos = filtroTorneioId === "todos" ? isError : erroFiltro;
  const refetchExibidos = filtroTorneioId === "todos" ? refetch : refetchFiltro;

  function invalidarTimes() {
    queryClient.invalidateQueries({ queryKey: ["times"] });
    queryClient.invalidateQueries({ queryKey: ["time"] });
    if (filtroTorneioId !== "todos") {
      queryClient.invalidateQueries({ queryKey: ["torneio-times", filtroTorneioId] });
    }
  }

  // o time só é vinculado a um torneio automaticamente no cadastro, se já existir
  // um torneio aberto daquela categoria naquele momento — se o torneio for criado
  // depois, o time fica sem torneio até alguém inscrever manualmente. Por isso,
  // ao aprovar, tentamos de novo (backend recusa se já estiver inscrito, ignoramos)
  async function tentarInscreverNoTorneio(time: Time, opts?: { avisarSeJaInscrito?: boolean }) {
    const torneioDaCategoria =
      torneios?.find((t) => t.tipo === time.tipo && t.status === "INSCRICOES") ??
      torneios?.find((t) => t.tipo === time.tipo);

    if (!torneioDaCategoria) {
      toast.warning(
        `Ainda não há torneio de ${tipoLabel[time.tipo]} cadastrado — crie um na tela de Torneios e inscreva o time depois.`
      );
      return;
    }

    try {
      await torneioService.inscreverTime(torneioDaCategoria.id, time.id);
      queryClient.invalidateQueries({ queryKey: ["torneio-times", torneioDaCategoria.id] });
      toast.success(`Time inscrito no torneio de ${tipoLabel[time.tipo]}.`);
    } catch {
      // ao aprovar, o time normalmente ja foi inscrito no cadastro — so avisa
      // quando alguem clica manualmente em "Inscrever no torneio"
      if (opts?.avisarSeJaInscrito) {
        toast.info("Esse time já estava inscrito no torneio.");
      }
    }
  }

  const aprovarTime = useMutation({
    mutationFn: timeService.aprovar,
    onSuccess: (timeAprovado) => {
      invalidarTimes();
      toast.success("Time aprovado.");
      tentarInscreverNoTorneio(timeAprovado);
    },
    onError: () => toast.error("Não foi possível aprovar o time."),
    onSettled: () => setProcessandoId(null),
  });

  const reprovarTime = useMutation({
    mutationFn: timeService.reprovar,
    onSuccess: () => {
      invalidarTimes();
      toast.success("Time reprovado.");
    },
    onError: () => toast.error("Não foi possível reprovar o time."),
    onSettled: () => setProcessandoId(null),
  });

  const uploadAudioGolMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => timeService.uploadAudioGol(id, file),
    onSuccess: () => {
      invalidarTimes();
      toast.success("Áudio de gol atualizado.");
    },
    onError: () => toast.error("Não foi possível enviar o áudio de gol."),
  });

  const uploadAudioVitoriaMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => timeService.uploadAudioVitoria(id, file),
    onSuccess: () => {
      invalidarTimes();
      toast.success("Áudio de vitória atualizado.");
    },
    onError: () => toast.error("Não foi possível enviar o áudio de vitória."),
  });

  function handleAprovar(time: Time) {
    setProcessandoId(time.id);
    setTimeDetalheId(null);
    aprovarTime.mutate(time.id);
  }

  function handleReprovar(time: Time) {
    setProcessandoId(time.id);
    setTimeDetalheId(null);
    reprovarTime.mutate(time.id);
  }

  async function handleInscrever(time: Time) {
    setProcessandoId(time.id);
    await tentarInscreverNoTorneio(time, { avisarSeJaInscrito: true });
    setProcessandoId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Times</h1>
          <p className="text-sm text-muted-foreground">Equipes inscritas no torneio.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filtroTorneioId === "todos" ? "todos" : String(filtroTorneioId)}
            onValueChange={(v) => setFiltroTorneioId(v === "todos" ? "todos" : Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por torneio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os times</SelectItem>
              {torneios?.map((torneio) => (
                <SelectItem key={torneio.id} value={String(torneio.id)}>
                  #{torneio.id} · {tipoLabel[torneio.tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Novo time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo time</DialogTitle>
                <DialogDescription>Cadastre uma equipe para o torneio. Ela entra como pendente até ser aprovada.</DialogDescription>
              </DialogHeader>
              <TimeCadastroForm submitLabel="Salvar" onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {erroExibidos ? (
            <div className="p-6">
              <ErrorState onRetry={() => refetchExibidos()} />
            </div>
          ) : carregandoExibidos ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : timesExibidos && timesExibidos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead className="w-16" />
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesExibidos.map((time) => (
                  <TableRow key={time.id}>
                    <TableCell className="text-muted-foreground">#{time.id}</TableCell>
                    <TableCell>
                      {time.imagem ? (
                        <img
                          src={`${API_BASE_URL}${time.imagem}`}
                          alt={time.nome}
                          className="h-10 w-10 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                          <Users className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{time.nome}</TableCell>
                    <TableCell>{tipoLabel[time.tipo]}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[time.status]}>{statusLabel[time.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setTimeDetalheId(time.id)}>
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                        {isAdmin && time.status === "PENDENTE" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processandoId === time.id}
                              onClick={() => handleAprovar(time)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              disabled={processandoId === time.id}
                              onClick={() => handleReprovar(time)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reprovar
                            </Button>
                          </>
                        )}
                        {isAdmin && time.status === "APROVADO" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processandoId === time.id}
                            onClick={() => handleInscrever(time)}
                          >
                            <Trophy className="h-3.5 w-3.5" />
                            Inscrever no torneio
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Users className="h-8 w-8" />
              <p className="text-sm">
                {filtroTorneioId === "todos"
                  ? "Nenhum time cadastrado ainda."
                  : "Nenhum time inscrito nesse torneio."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={timeDetalheId !== null} onOpenChange={(v) => !v && setTimeDetalheId(null)}>
        <DialogContent>
          {carregandoDetalhe ? (
            <div className="space-y-4 py-2">
              <Skeleton className="mx-auto h-32 w-32 rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : erroDetalhe ? (
            <ErrorState message="Não foi possível carregar os detalhes do time." />
          ) : (
            timeDetalhe && (
            <>
              <DialogHeader>
                <DialogTitle>{timeDetalhe.nome}</DialogTitle>
                <DialogDescription>
                  {tipoLabel[timeDetalhe.tipo]} ·{" "}
                  <Badge variant={statusVariant[timeDetalhe.status]} className="align-middle">
                    {statusLabel[timeDetalhe.status]}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex justify-center">
                  {timeDetalhe.imagem ? (
                    <img
                      src={`${API_BASE_URL}${timeDetalhe.imagem}`}
                      alt={timeDetalhe.nome}
                      className="h-32 w-32 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                      <Users className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <TimeAudioRevisao
                  label="Áudio de gol (até 2s)"
                  audioUrl={timeDetalhe.audioGol}
                  duracaoMaxima={2}
                  editavel={isAdmin}
                  enviando={uploadAudioGolMutation.isPending && uploadAudioGolMutation.variables?.id === timeDetalhe.id}
                  onSubstituir={(file) => uploadAudioGolMutation.mutate({ id: timeDetalhe.id, file })}
                />

                <TimeAudioRevisao
                  label="Áudio de vitória (até 10s)"
                  audioUrl={timeDetalhe.audioVitoria}
                  duracaoMaxima={10}
                  editavel={isAdmin}
                  enviando={
                    uploadAudioVitoriaMutation.isPending && uploadAudioVitoriaMutation.variables?.id === timeDetalhe.id
                  }
                  onSubstituir={(file) => uploadAudioVitoriaMutation.mutate({ id: timeDetalhe.id, file })}
                />
              </div>

              {isAdmin && timeDetalhe.status === "PENDENTE" && (
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={processandoId === timeDetalhe.id}
                    onClick={() => handleReprovar(timeDetalhe)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reprovar
                  </Button>
                  <Button disabled={processandoId === timeDetalhe.id} onClick={() => handleAprovar(timeDetalhe)}>
                    <Check className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                </div>
              )}

              {isAdmin && timeDetalhe.status === "APROVADO" && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    variant="outline"
                    disabled={processandoId === timeDetalhe.id}
                    onClick={() => handleInscrever(timeDetalhe)}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Inscrever no torneio
                  </Button>
                </div>
              )}
            </>
          )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
