import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Trophy, UserMinus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { timeService } from "@/services/timeService";
import { torneioService } from "@/services/torneioService";
import { resolveArquivoUrl } from "@/services/api";
import { useAuth } from "@/lib/auth";
import type { EnumTime, StatusTime, Time } from "@/types/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { TimeCadastroForm } from "@/components/TimeCadastroForm";
import { TimeAudioRevisao } from "@/components/TimeAudioRevisao";
import { TimeImagemRevisao } from "@/components/TimeImagemRevisao";
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

function extrairMensagemErro(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data.erro === "string" && data.erro.trim()) return data.erro;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  return fallback;
}

const tipoLabel: Record<EnumTime, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
  MARATONA_PROGRAMACAO: "Maratona de Programação",
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

  // ao aprovar um time, se existir um torneio aberto da mesma categoria,
  // inscrevemos automaticamente o time no torneio
  async function tentarInscreverNoTorneio(time: Time, opts?: { avisarSeJaInscrito?: boolean }) {
    const torneioDaCategoria =
      torneios?.find((t) => t.tipo === time.tipo && t.status === "INSCRICOES") ??
      torneios?.find((t) => t.tipo === time.tipo);

    if (!torneioDaCategoria) {
      toast.warning(
        `Time aprovado, mas ainda não há torneio de ${tipoLabel[time.tipo]} cadastrado — crie um na tela de Torneios e inscreva o time depois.`
      );
      return;
    }

    try {
      await torneioService.inscreverTime(torneioDaCategoria.id, time.id);
      invalidarTimes();
      toast.success(`Time inscrito no torneio de ${tipoLabel[time.tipo]}.`);
    } catch (err: any) {
      if (opts?.avisarSeJaInscrito) {
        const msg = extrairMensagemErro(err, "Esse time já estava inscrito no torneio.");
        toast.info(msg);
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
    onError: (err: any) => {
      const msg = extrairMensagemErro(err, "Não foi possível aprovar o time.");
      toast.error(msg);
    },
    onSettled: () => setProcessandoId(null),
  });

  const reprovarTime = useMutation({
    mutationFn: timeService.reprovar,
    onSuccess: () => {
      invalidarTimes();
      toast.success("Time reprovado.");
    },
    onError: (err: any) => {
      const msg = extrairMensagemErro(err, "Não foi possível reprovar o time.");
      toast.error(msg);
    },
    onSettled: () => setProcessandoId(null),
  });

  const removerInscricaoMutation = useMutation({
    mutationFn: ({ torneioId, timeId }: { torneioId: number; timeId: number }) =>
      torneioService.removerTime(torneioId, timeId),
    onSuccess: () => {
      invalidarTimes();
      toast.success("Time desinscrito do torneio.");
    },
    onError: (err: any) => {
      const msg = extrairMensagemErro(err, "Não foi possível remover o time do torneio.");
      toast.error(msg);
    },
    onSettled: () => setProcessandoId(null),
  });

  const uploadImagemMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => timeService.uploadImagem(id, file),
    onSuccess: (timeAtualizado) => {
      queryClient.setQueryData(["time", timeAtualizado.id], timeAtualizado);
      invalidarTimes();
      toast.success("Foto do time atualizada.");
    },
    onError: () => toast.error("Não foi possível enviar a foto do time."),
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

  function handleRemoverInscricao(time: Time) {
    if (!time.torneioId) return;
    setProcessandoId(time.id);
    removerInscricaoMutation.mutate({ torneioId: time.torneioId, timeId: time.id });
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
                  <TableHead>Torneio</TableHead>
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
                          src={resolveArquivoUrl(time.imagem)}
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
                      {time.torneioId ? (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          Torneio #{time.torneioId}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              disabled={processandoId === time.id}
                              onClick={() => handleReprovar(time)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reprovar
                            </Button>
                          </>
                        )}
                        {isAdmin && time.status === "APROVADO" && (
                          time.torneioId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              disabled={processandoId === time.id}
                              onClick={() => handleRemoverInscricao(time)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Remover do torneio
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processandoId === time.id}
                              onClick={() => handleInscrever(time)}
                            >
                              <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                              Inscrever no torneio
                            </Button>
                          )
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
                  <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                    <span>{tipoLabel[timeDetalhe.tipo]}</span>
                    <span>·</span>
                    <Badge variant={statusVariant[timeDetalhe.status]} className="align-middle">
                      {statusLabel[timeDetalhe.status]}
                    </Badge>
                    {timeDetalhe.torneioId ? (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Torneio #{timeDetalhe.torneioId}
                      </Badge>
                    ) : null}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <TimeImagemRevisao
                    imagemUrl={timeDetalhe.imagem}
                    nomeTime={timeDetalhe.nome}
                    editavel={isAdmin}
                    enviando={
                      uploadImagemMutation.isPending && uploadImagemMutation.variables?.id === timeDetalhe.id
                    }
                    onSubstituir={(file) => uploadImagemMutation.mutate({ id: timeDetalhe.id, file })}
                  />

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

                {isAdmin && (
                  <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                    {timeDetalhe.status === "PENDENTE" && (
                      <>
                        <Button
                          variant="outline"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          disabled={processandoId === timeDetalhe.id}
                          onClick={() => handleReprovar(timeDetalhe)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reprovar
                        </Button>
                        <Button
                          variant="outline"
                          disabled={processandoId === timeDetalhe.id}
                          onClick={() => handleAprovar(timeDetalhe)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                      </>
                    )}

                    {timeDetalhe.status === "APROVADO" && (
                      timeDetalhe.torneioId ? (
                        <Button
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                          disabled={processandoId === timeDetalhe.id}
                          onClick={() => handleRemoverInscricao(timeDetalhe)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Remover do torneio
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          disabled={processandoId === timeDetalhe.id}
                          onClick={() => handleInscrever(timeDetalhe)}
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          Inscrever no torneio
                        </Button>
                      )
                    )}

                    {timeDetalhe.status === "REJEITADO" && (
                      <Button
                        variant="outline"
                        disabled={processandoId === timeDetalhe.id}
                        onClick={() => handleAprovar(timeDetalhe)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                    )}
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
