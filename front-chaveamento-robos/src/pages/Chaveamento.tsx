import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw, Shuffle, Swords, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { chaveamentoService } from "@/services/chaveamentoService";
import { partidaService } from "@/services/partidaService";
import { torneioService } from "@/services/torneioService";
import { timeService } from "@/services/timeService";
import { resolveArquivoUrl } from "@/services/api";
import type { EnumTorneio } from "@/types/torneio";
import type { Time } from "@/types/time";
import type { FasePartida, Partida } from "@/types/partida";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import {
  VersusOverlay,
  getModoPartidaSalvo,
  salvarModoPartida,
  limparModoPartida,
  limparPlacarManual,
  getPlacarManualSalvo,
} from "@/components/VersusOverlay";
import { ChampionOverlay } from "@/components/ChampionOverlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tipoLabel: Record<EnumTorneio, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
  MARATONA_PROGRAMACAO: "Maratona de Programação",
};

const faseLabel: Record<FasePartida, string> = {
  OITAVAS: "Oitavas de final",
  QUARTAS: "Quartas de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

const ordemFases: FasePartida[] = ["OITAVAS", "QUARTAS", "SEMIFINAL", "FINAL"];

function ehPotenciaDeDois(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

const ROW_HEIGHT = 160;
const CARD_HEIGHT = 124;
const COLUMN_GAP = 56;
const COLUMN_WIDTH = 288;

interface TimeInfo {
  nome: string;
  imagem: string | null;
  audioGol: string | null;
  audioVitoria: string | null;
}

export default function Chaveamento() {
  const queryClient = useQueryClient();
  const [torneioId, setTorneioId] = useState<number | "">("");
  const [partidaSelecionada, setPartidaSelecionada] = useState<Partida | null>(null);
  const [placarA, setPlacarA] = useState("");
  const [placarB, setPlacarB] = useState("");
  const [erroResultado, setErroResultado] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [partidaEmAnimacao, setPartidaEmAnimacao] = useState<Partida | null>(null);
  const [modoDuelo, setModoDuelo] = useState<"manual" | "automatico">("manual");
  const [campeao, setCampeao] = useState<TimeInfo | null>(null);

  const { data: torneios, isLoading: carregandoTorneios } = useQuery({
    queryKey: ["torneios"],
    queryFn: torneioService.listar,
  });

  const { data: times } = useQuery({
    queryKey: ["times"],
    queryFn: timeService.listar,
  });

  const { data: timesInscritos, isLoading: carregandoTimesInscritos } = useQuery({
    queryKey: ["torneio-times", torneioId],
    queryFn: () => torneioService.listarTimes(torneioId as number),
    enabled: torneioId !== "",
  });

  useEffect(() => {
    if (torneioId === "" && torneios && torneios.length > 0) {
      setTorneioId(torneios[0].id);
    }
  }, [torneios, torneioId]);

  // Só aciona o polling na API quando o overlay estiver aberto no modo automático.
  // Se o overlay estiver fechado ou em modo manual, o polling fica completamente desligado (false).
  const intervaloPolling = (partidaEmAnimacao && modoDuelo === "automatico") ? 1500 : false;

  const {
    data: partidas,
    isLoading: carregandoPartidas,
    isError: erroPartidas,
    refetch,
  } = useQuery({
    queryKey: ["chaveamento", torneioId],
    queryFn: () => chaveamentoService.listar(torneioId as number),
    enabled: torneioId !== "",
    refetchInterval: intervaloPolling,
    refetchIntervalInBackground: intervaloPolling !== false,
  });

  const gerarChaveamento = useMutation({
    mutationFn: () => chaveamentoService.gerar(torneioId as number),
    onSuccess: () => {
      partidas?.forEach((p) => {
        limparPlacarManual(p.id);
        limparModoPartida(p.id);
      });
      queryClient.invalidateQueries({ queryKey: ["chaveamento", torneioId] });
      toast.success("Chaveamento gerado com sucesso.");
    },
    onError: () => {
      toast.error(
        temResultadoRegistrado
          ? "Não é possível sortear novamente: já existem resultados registrados neste chaveamento."
          : "Não foi possível gerar o chaveamento — confira se a quantidade de times inscritos é uma potência de 2 (2, 4, 8, 16)."
      );
    },
  });

  const resetarChaveamento = useMutation({
    mutationFn: () => chaveamentoService.resetar(torneioId as number),
    onSuccess: () => {
      partidas?.forEach((p) => {
        limparPlacarManual(p.id);
        limparModoPartida(p.id);
      });
      queryClient.invalidateQueries({ queryKey: ["chaveamento", torneioId] });
      toast.success("Chaveamento zerado.");
      setConfirmandoReset(false);
    },
    onError: () => {
      toast.error("Não foi possível zerar o chaveamento.");
    },
  });

  const registrarResultado = useMutation({
    mutationFn: () => {
      const payload = {
        placarTimeA: Number(placarA),
        placarTimeB: Number(placarB),
      };
      if (partidaSelecionada?.status === "FINALIZADA") {
        return partidaService.atualizarResultado(partidaSelecionada.id, payload);
      }
      return partidaService.registrarResultado(partidaSelecionada!.id, payload);
    },
    onSuccess: (partidaAtualizada) => {
      limparPlacarManual(partidaSelecionada?.id);
      limparModoPartida(partidaSelecionada?.id);
      queryClient.invalidateQueries({ queryKey: ["chaveamento", torneioId] });
      toast.success(
        partidaSelecionada?.status === "FINALIZADA"
          ? "Resultado da partida atualizado com sucesso."
          : "Resultado registrado com sucesso."
      );
      fecharDialogResultado();

      if (partidaAtualizada.fase === "FINAL" && partidaAtualizada.vencedorId) {
        setCampeao(getTime(partidaAtualizada.vencedorId));
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.erro ?? "Não foi possível salvar o resultado.";
      toast.error(msg);
    },
  });

  const timePorId = useMemo(() => {
    const mapa = new Map<number, Time>();
    times?.forEach((time) => mapa.set(time.id, time));
    return mapa;
  }, [times]);

  function nomeTime(id: number | null) {
    if (id === null) return null;
    return timePorId.get(id)?.nome ?? `Time #${id}`;
  }

  function getTime(id: number | null): TimeInfo | null {
    if (id === null) return null;
    const time = timePorId.get(id);
    return {
      nome: time?.nome ?? `Time #${id}`,
      imagem: time?.imagem ?? null,
      audioGol: time?.audioGol ?? null,
      audioVitoria: time?.audioVitoria ?? null,
    };
  }

  const rodadas = useMemo(() => {
    if (!partidas) return [];
    return ordemFases
      .map((fase) => ({
        fase,
        partidas: partidas
          .filter((p) => p.fase === fase)
          .sort((a, b) => a.id - b.id),
      }))
      .filter((rodada) => rodada.partidas.length > 0);
  }, [partidas]);

  const rodadasNaoFinais = useMemo(() => rodadas.filter((r) => r.fase !== "FINAL"), [rodadas]);
  const rodadaFinal = rodadas.find((r) => r.fase === "FINAL");
  const temLadosDuplos = rodadasNaoFinais.length > 0;

  const alturaBracket = temLadosDuplos
    ? metade(rodadasNaoFinais[0].partidas, "esquerda").length * ROW_HEIGHT
    : ROW_HEIGHT;

  const quantidadeTimesInscritos = timesInscritos?.length ?? 0;
  const quantidadeInvalida = quantidadeTimesInscritos > 0 && !ehPotenciaDeDois(quantidadeTimesInscritos);
  const temResultadoRegistrado = partidas?.some((p) => p.status === "FINALIZADA") ?? false;

  const bracketScrollRef = useRef<HTMLDivElement>(null);

  // sempre que o chaveamento muda (troca de torneio, gerar/zerar), garante que a
  // visualização comece no início — sem isso o navegador às vezes preserva/ajusta
  // sozinho a rolagem e esconde as fases mais externas do lado esquerdo
  useEffect(() => {
    if (bracketScrollRef.current) {
      bracketScrollRef.current.scrollLeft = 0;
    }
  }, [rodadas]);

  function abrirDialogResultado(partida: Partida) {
    setPartidaSelecionada(partida);
    const modoSalvo = getModoPartidaSalvo(partida.id);
    const manualSalvo = modoSalvo !== "automatico" ? getPlacarManualSalvo(partida.id) : null;
    setPlacarA(
      manualSalvo !== null
        ? String(manualSalvo.placarA)
        : partida.placarTimeA !== null
        ? String(partida.placarTimeA)
        : ""
    );
    setPlacarB(
      manualSalvo !== null
        ? String(manualSalvo.placarB)
        : partida.placarTimeB !== null
        ? String(partida.placarTimeB)
        : ""
    );
    setErroResultado(null);
  }

  function abrirAnimacaoPartida(partida: Partida) {
    setPartidaEmAnimacao(partida);
    const modoSalvo = getModoPartidaSalvo(partida.id);
    setModoDuelo(modoSalvo ?? "manual");
  }

  function fecharDialogResultado() {
    setPartidaSelecionada(null);
    setPlacarA("");
    setPlacarB("");
    setErroResultado(null);
  }

  function handleSubmitResultado(e: FormEvent) {
    e.preventDefault();
    if (placarA === "" || placarB === "") {
      setErroResultado("Preencha o placar dos dois times.");
      return;
    }
    if (Number(placarA) === Number(placarB)) {
      setErroResultado("A partida não pode terminar empatada.");
      return;
    }
    setErroResultado(null);
    registrarResultado.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chaveamento</h1>
          <p className="text-sm text-muted-foreground">Disputa em eliminação simples do torneio.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={torneioId ? String(torneioId) : ""}
            onValueChange={(v) => setTorneioId(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione um torneio" />
            </SelectTrigger>
            <SelectContent>
              {torneios?.map((torneio) => (
                <SelectItem key={torneio.id} value={String(torneio.id)}>
                  {tipoLabel[torneio.tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {partidas && partidas.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => gerarChaveamento.mutate()}
                disabled={gerarChaveamento.isPending}
              >
                <Shuffle className="h-4 w-4" />
                Sortear novamente
              </Button>

              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={() => setConfirmandoReset(true)}
              >
                <RotateCcw className="h-4 w-4" />
                Zerar tudo
              </Button>
            </>
          )}
        </div>
      </div>

      {!carregandoTimesInscritos && quantidadeInvalida && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Este torneio tem {quantidadeTimesInscritos} time{quantidadeTimesInscritos === 1 ? "" : "s"} inscrito
            {quantidadeTimesInscritos === 1 ? "" : "s"} — para gerar o chaveamento, a quantidade precisa ser uma
            potência de 2 (2, 4, 8, 16).
          </span>
        </div>
      )}

      {carregandoTorneios ? (
        <Skeleton className="h-64 w-full" />
      ) : !torneios || torneios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Trophy className="h-8 w-8" />
            <p className="text-sm">Nenhum torneio criado ainda — crie um na aba Torneios primeiro.</p>
          </CardContent>
        </Card>
      ) : erroPartidas ? (
        <Card>
          <CardContent className="p-6">
            <ErrorState onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : carregandoPartidas ? (
        <Skeleton className="h-64 w-full" />
      ) : !partidas || partidas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Swords className="h-8 w-8" />
            {!carregandoTimesInscritos && timesInscritos?.length === 0 ? (
              <p className="text-sm">
                Nenhum time inscrito neste torneio ainda — inscreva times na aba Torneios primeiro.
              </p>
            ) : quantidadeInvalida ? (
              <p className="text-sm">Chaveamento ainda não gerado para este torneio.</p>
            ) : (
              <>
                <p className="text-sm">Chaveamento ainda não gerado para este torneio.</p>
                <Button onClick={() => gerarChaveamento.mutate()} disabled={gerarChaveamento.isPending}>
                  <Shuffle className="h-4 w-4" />
                  {gerarChaveamento.isPending ? "Gerando..." : "Gerar chaveamento"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div ref={bracketScrollRef} className="overflow-x-auto [overflow-anchor:none]">
            <div className="flex w-max min-w-full items-center justify-center">
              {!temLadosDuplos ? (
                <p
                  className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: COLUMN_WIDTH }}
                >
                  {faseLabel.FINAL}
                </p>
              ) : (
                <>
                  {rodadasNaoFinais.map((rodada) => (
                    <div key={`label-esq-${rodada.fase}`} className="flex items-center">
                      <p
                        className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        style={{ width: COLUMN_WIDTH }}
                      >
                        {faseLabel[rodada.fase]}
                      </p>
                      <div className="shrink-0" style={{ width: COLUMN_GAP }} />
                    </div>
                  ))}

                  <p
                    className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    style={{ width: COLUMN_WIDTH }}
                  >
                    {faseLabel.FINAL}
                  </p>

                  {[...rodadasNaoFinais].reverse().map((rodada) => (
                    <div key={`label-dir-${rodada.fase}`} className="flex items-center">
                      <div className="shrink-0" style={{ width: COLUMN_GAP }} />
                      <p
                        className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        style={{ width: COLUMN_WIDTH }}
                      >
                        {faseLabel[rodada.fase]}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="mt-3 flex w-max min-w-full items-center justify-center pb-4">
              {!temLadosDuplos ? (
                <MatchColumn
                  partidas={rodadaFinal!.partidas}
                  altura={alturaBracket}
                  getTime={getTime}
                  onRegistrarResultado={abrirDialogResultado}
                  onIniciarPartida={abrirAnimacaoPartida}
                  destaque
                />
              ) : (
                <>
                  {rodadasNaoFinais.map((rodada, i) => {
                    const ladoEsq = metade(rodada.partidas, "esquerda");
                    const ehUltima = i === rodadasNaoFinais.length - 1;
                    return (
                      <div key={`esq-${rodada.fase}`} className="flex items-stretch">
                        <MatchColumn
                          partidas={ladoEsq}
                          altura={alturaBracket}
                          getTime={getTime}
                          onRegistrarResultado={abrirDialogResultado}
                  onIniciarPartida={abrirAnimacaoPartida}
                        />
                        {ehUltima ? (
                          <ConectorReto altura={alturaBracket} />
                        ) : (
                          <Conector altura={alturaBracket} quantidadePartidas={ladoEsq.length} />
                        )}
                      </div>
                    );
                  })}

                  <MatchColumn
                    partidas={rodadaFinal!.partidas}
                    altura={alturaBracket}
                    getTime={getTime}
                    onRegistrarResultado={abrirDialogResultado}
                  onIniciarPartida={abrirAnimacaoPartida}
                    destaque
                  />

                  {[...rodadasNaoFinais].reverse().map((rodada, i) => {
                    const ladoDir = metade(rodada.partidas, "direita");
                    return (
                      <div key={`dir-${rodada.fase}`} className="flex items-stretch">
                        {i === 0 ? (
                          <ConectorReto altura={alturaBracket} />
                        ) : (
                          <Conector altura={alturaBracket} quantidadePartidas={ladoDir.length} espelhado />
                        )}
                        <MatchColumn
                          partidas={ladoDir}
                          altura={alturaBracket}
                          getTime={getTime}
                          onRegistrarResultado={abrirDialogResultado}
                  onIniciarPartida={abrirAnimacaoPartida}
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!partidaSelecionada} onOpenChange={(v) => !v && fecharDialogResultado()}>
        <DialogContent className="sm:max-w-md">
          {partidaSelecionada && (() => {
            const ehFinalizada = partidaSelecionada.status === "FINALIZADA";
            const timeA = getTime(partidaSelecionada.timeAId);
            const timeB = getTime(partidaSelecionada.timeBId);
            const numA = Number(placarA);
            const numB = Number(placarB);
            const preenchido = placarA.trim() !== "" && placarB.trim() !== "";
            const empate = preenchido && numA === numB;
            const vencedorCalculado = preenchido && !empate ? (numA > numB ? timeA : timeB) : null;

            return (
              <form onSubmit={handleSubmitResultado} className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <DialogTitle>
                      {ehFinalizada ? "Detalhes da Partida" : "Registrar Resultado"}
                    </DialogTitle>
                    {ehFinalizada ? (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                        Finalizada
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="border border-amber-500/30">
                        {partidaSelecionada.status === "EM_ANDAMENTO" ? "Em andamento" : "Aguardando"}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription>
                    {faseLabel[partidaSelecionada.fase]} · {nomeTime(partidaSelecionada.timeAId)} x {nomeTime(partidaSelecionada.timeBId)}
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-around gap-2">
                    {/* Time A */}
                    <div className="flex flex-col items-center gap-2 flex-1 text-center min-w-0">
                      <TeamAvatar time={timeA} destaque />
                      <span className="font-semibold text-xs truncate max-w-[110px]" title={timeA?.nome}>
                        {timeA?.nome ?? "Time A"}
                      </span>
                      <div className="w-20">
                        <Label htmlFor="placar-a" className="sr-only">Placar {timeA?.nome}</Label>
                        <Input
                          id="placar-a"
                          type="number"
                          min={0}
                          className="text-center font-mono text-base font-bold h-9"
                          value={placarA}
                          onChange={(e) => setPlacarA(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* VS / Status do confronto */}
                    <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1">
                      <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">VS</span>
                      {vencedorCalculado ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 max-w-[120px] truncate">
                          <Trophy className="h-3 w-3 shrink-0" />
                          <span className="truncate">{vencedorCalculado.nome}</span>
                        </span>
                      ) : empate ? (
                        <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                          Empate inválido
                        </span>
                      ) : null}
                    </div>

                    {/* Time B */}
                    <div className="flex flex-col items-center gap-2 flex-1 text-center min-w-0">
                      <TeamAvatar time={timeB} destaque />
                      <span className="font-semibold text-xs truncate max-w-[110px]" title={timeB?.nome}>
                        {timeB?.nome ?? "Time B"}
                      </span>
                      <div className="w-20">
                        <Label htmlFor="placar-b" className="sr-only">Placar {timeB?.nome}</Label>
                        <Input
                          id="placar-b"
                          type="number"
                          min={0}
                          className="text-center font-mono text-base font-bold h-9"
                          value={placarB}
                          onChange={(e) => setPlacarB(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {ehFinalizada && (
                  <p className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded border border-border/50">
                    💡 <strong>Edição de partida finalizada:</strong> Se você corrigir o placar ou alterar o time vencedor, a chave atualizará o resultado e avançará automaticamente o ganhador correto para a próxima fase.
                  </p>
                )}

                {erroResultado && <p className="text-xs font-medium text-destructive">{erroResultado}</p>}

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                  <div>
                    {!ehFinalizada && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const p = partidaSelecionada;
                          fecharDialogResultado();
                          abrirAnimacaoPartida(p);
                        }}
                      >
                        <Swords className="h-3.5 w-3.5 mr-1.5" />
                        Ver duelo ao vivo
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={fecharDialogResultado}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={registrarResultado.isPending || empate}>
                      {registrarResultado.isPending
                        ? "Salvando..."
                        : ehFinalizada
                        ? "Salvar alterações"
                        : "Salvar resultado"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoReset} onOpenChange={setConfirmandoReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zerar chaveamento?</DialogTitle>
            <DialogDescription>
              Isso apaga todas as partidas e resultados registrados neste torneio. Não tem como desfazer — depois
              você precisa gerar o chaveamento de novo do zero.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetarChaveamento.mutate()}
              disabled={resetarChaveamento.isPending}
            >
              {resetarChaveamento.isPending ? "Zerando..." : "Zerar tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {partidaEmAnimacao && (() => {
        const partidaAoVivo = partidas?.find((p) => p.id === partidaEmAnimacao.id) ?? partidaEmAnimacao;
        return (
          <VersusOverlay
            key={partidaAoVivo.id}
            partida={partidaAoVivo}
            timeA={getTime(partidaAoVivo.timeAId)}
            timeB={getTime(partidaAoVivo.timeBId)}
            ehFinal={partidaAoVivo.fase === "FINAL"}
            modo={modoDuelo}
            onModoChange={(novoModo) => {
              setModoDuelo(novoModo);
              salvarModoPartida(partidaAoVivo.id, novoModo);
            }}
            onFechar={() => setPartidaEmAnimacao(null)}
            onConfirmar={(scoreA, scoreB) => {
              limparPlacarManual(partidaAoVivo.id);
              limparModoPartida(partidaAoVivo.id);
              abrirDialogResultado(partidaAoVivo);
              setPlacarA(String(scoreA));
              setPlacarB(String(scoreB));
              setPartidaEmAnimacao(null);
            }}
          />
        );
      })()}

      {campeao && <ChampionOverlay time={campeao} onClose={() => setCampeao(null)} />}
    </div>
  );
}

function metade(partidas: Partida[], lado: "esquerda" | "direita") {
  const meio = Math.floor(partidas.length / 2);
  return lado === "esquerda" ? partidas.slice(0, meio) : partidas.slice(meio);
}

interface MatchColumnProps {
  partidas: Partida[];
  altura: number;
  getTime: (id: number | null) => TimeInfo | null;
  onRegistrarResultado: (partida: Partida) => void;
  onIniciarPartida: (partida: Partida) => void;
  destaque?: boolean;
}

function MatchColumn({
  partidas,
  altura,
  getTime,
  onRegistrarResultado,
  onIniciarPartida,
  destaque = false,
}: MatchColumnProps) {
  return (
    <div className="flex shrink-0 flex-col justify-around gap-2" style={{ height: altura, width: COLUMN_WIDTH }}>
      {partidas.map((partida) => (
        <MatchCard
          key={partida.id}
          partida={partida}
          timeA={getTime(partida.timeAId)}
          timeB={getTime(partida.timeBId)}
          onRegistrarResultado={() => onRegistrarResultado(partida)}
          onIniciarPartida={() => onIniciarPartida(partida)}
          destaque={destaque}
        />
      ))}
    </div>
  );
}

interface MatchCardProps {
  partida: Partida;
  timeA: TimeInfo | null;
  timeB: TimeInfo | null;
  onRegistrarResultado: () => void;
  onIniciarPartida: () => void;
  destaque?: boolean;
}

function MatchCard({ partida, timeA, timeB, onRegistrarResultado, onIniciarPartida, destaque = false }: MatchCardProps) {
  const finalizada = partida.status === "FINALIZADA";
  const emAndamento = partida.status === "EM_ANDAMENTO";
  const prontaParaJogar = partida.timeAId !== null && partida.timeBId !== null;
  const venceuA = finalizada && partida.vencedorId === partida.timeAId;
  const venceuB = finalizada && partida.vencedorId === partida.timeBId;
  const perdeuA = finalizada && !venceuA;
  const perdeuB = finalizada && !venceuB;

  const modoSalvo = getModoPartidaSalvo(partida.id);
  const manualSalvo = !finalizada && modoSalvo !== "automatico" ? getPlacarManualSalvo(partida.id) : null;
  const placarExibidoA = manualSalvo ? manualSalvo.placarA : partida.placarTimeA;
  const placarExibidoB = manualSalvo ? manualSalvo.placarB : partida.placarTimeB;
  const emAndamentoOuManual = emAndamento || manualSalvo !== null;

  const clicavel = prontaParaJogar || finalizada;

  return (
    <div
      role={clicavel ? "button" : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onClick={clicavel ? onRegistrarResultado : undefined}
      onKeyDown={
        clicavel
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRegistrarResultado();
              }
            }
          : undefined
      }
      title={
        finalizada
          ? "Partida finalizada — clique no card para ver detalhes ou editar o resultado"
          : prontaParaJogar
          ? "Clique no card para ver detalhes e registrar o resultado"
          : undefined
      }
      className={`flex flex-col justify-center gap-2 rounded-lg border bg-card p-2.5 shadow-sm transition-all ${
        finalizada
          ? "opacity-75 hover:opacity-100 cursor-pointer hover:border-primary/50 hover:shadow-md"
          : prontaParaJogar
          ? "cursor-pointer hover:border-primary/40 hover:shadow-md"
          : ""
      } ${destaque ? "text-base" : "text-sm"}`}
      style={{ height: destaque ? CARD_HEIGHT + 24 : CARD_HEIGHT }}
    >
      {/* Badge centralizada de status - só renderiza se houver status ativo */}
      {(emAndamentoOuManual || finalizada) && (
        <div className="flex items-center justify-center">
          {emAndamentoOuManual ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25 flex items-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              Em andamento
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              Finalizada
            </span>
          )}
        </div>
      )}

      {/* Confronto: Avatar + Nome embaixo de cada time, e Placar no centro */}
      <div className="flex items-start justify-between gap-2 px-1">
        {/* Time A */}
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <TeamAvatar time={timeA} apagado={perdeuA} destaque={destaque} />
          <span
            className={`w-full truncate text-center text-xs font-medium leading-tight ${nomeClasse(venceuA)}`}
            title={timeA?.nome}
          >
            {timeA?.nome ?? "A definir"}
          </span>
        </div>

        {/* Placar no centro alinhado aos avatares */}
        <div className="flex items-center justify-center gap-1 shrink-0 pt-2">
          <span
            className={`min-w-[24px] text-center font-mono font-bold text-xs px-2 py-1 rounded transition-all ${
              venceuA
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/40"
                : emAndamentoOuManual
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-muted text-foreground"
            }`}
          >
            {placarExibidoA !== null
              ? placarExibidoA
              : emAndamentoOuManual
              ? 0
              : "-"}
          </span>

          <span className="text-[11px] font-bold text-muted-foreground/60 px-0.5">x</span>

          <span
            className={`min-w-[24px] text-center font-mono font-bold text-xs px-2 py-1 rounded transition-all ${
              venceuB
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/40"
                : emAndamentoOuManual
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-muted text-foreground"
            }`}
          >
            {placarExibidoB !== null
              ? placarExibidoB
              : emAndamentoOuManual
              ? 0
              : "-"}
          </span>
        </div>

        {/* Time B */}
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <TeamAvatar time={timeB} apagado={perdeuB} destaque={destaque} />
          <span
            className={`w-full truncate text-center text-xs font-medium leading-tight ${nomeClasse(venceuB)}`}
            title={timeB?.nome}
          >
            {timeB?.nome ?? "A definir"}
          </span>
        </div>
      </div>

      {/* Ações inferiores - apenas para partidas não finalizadas */}
      {!finalizada && prontaParaJogar && (
        <div className="flex items-center justify-center gap-2 text-[11px] font-medium pt-1 border-t border-border/40">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIniciarPartida();
            }}
            className="text-muted-foreground hover:underline"
          >
            {emAndamentoOuManual ? "Ver duelo ao vivo" : "Iniciar partida"}
          </button>
          <span className="text-muted-foreground/50">·</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegistrarResultado();
            }}
            className="text-primary hover:underline"
          >
            Registrar resultado
          </button>
        </div>
      )}
    </div>
  );
}

function nomeClasse(venceu: boolean) {
  return venceu ? "font-semibold text-foreground" : "text-muted-foreground";
}

function TeamAvatar({
  time,
  apagado = false,
  destaque = false,
}: {
  time: TimeInfo | null;
  apagado?: boolean;
  destaque?: boolean;
}) {
  const tamanho = destaque ? "h-12 w-12" : "h-10 w-10";

  if (time?.imagem) {
    return (
      <img
        src={resolveArquivoUrl(time.imagem)}
        alt={time.nome}
        className={`${tamanho} shrink-0 rounded-md border object-cover shadow-sm ${apagado ? "grayscale opacity-50" : ""}`}
      />
    );
  }

  return (
    <div
      className={`flex ${tamanho} shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground shadow-sm ${apagado ? "opacity-50" : ""}`}
    >
      <Users className={destaque ? "h-6 w-6" : "h-5 w-5"} />
    </div>
  );
}

function Conector({
  altura,
  quantidadePartidas,
  espelhado = false,
}: {
  altura: number;
  quantidadePartidas: number;
  espelhado?: boolean;
}) {
  const largura = COLUMN_GAP;
  const meio = largura / 2;
  const linhas = [];

  for (let i = 0; i < quantidadePartidas; i += 2) {
    const y1 = ((i + 0.5) * altura) / quantidadePartidas;
    const y2 = ((i + 1.5) * altura) / quantidadePartidas;
    const ym = (y1 + y2) / 2;

    linhas.push(
      <path
        key={i}
        d={`M0,${y1} H${meio} M0,${y2} H${meio} M${meio},${y1} V${y2} M${meio},${ym} H${largura}`}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
    );
  }

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className="shrink-0 self-stretch text-border"
      style={espelhado ? { transform: "scaleX(-1)" } : undefined}
    >
      {linhas}
    </svg>
  );
}

function ConectorReto({ altura }: { altura: number }) {
  const largura = COLUMN_GAP;
  const y = altura / 2;

  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="shrink-0 self-stretch text-border">
      <path d={`M0,${y} H${largura}`} stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  );
}
