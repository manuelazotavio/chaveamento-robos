import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw, Shuffle, Swords, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { chaveamentoService } from "@/services/chaveamentoService";
import { partidaService } from "@/services/partidaService";
import { torneioService } from "@/services/torneioService";
import { timeService } from "@/services/timeService";
import { API_BASE_URL } from "@/services/api";
import type { EnumTorneio } from "@/types/torneio";
import type { Time } from "@/types/time";
import type { FasePartida, Partida } from "@/types/partida";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { VersusOverlay } from "@/components/VersusOverlay";
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

const ROW_HEIGHT = 116;
const CARD_HEIGHT = 84;
const COLUMN_GAP = 56;
const COLUMN_WIDTH = 256;

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

  const {
    data: partidas,
    isLoading: carregandoPartidas,
    isError: erroPartidas,
    refetch,
  } = useQuery({
    queryKey: ["chaveamento", torneioId],
    queryFn: () => chaveamentoService.listar(torneioId as number),
    enabled: torneioId !== "",
  });

  const gerarChaveamento = useMutation({
    mutationFn: () => chaveamentoService.gerar(torneioId as number),
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ["chaveamento", torneioId] });
      toast.success("Chaveamento zerado.");
      setConfirmandoReset(false);
    },
    onError: () => {
      toast.error("Não foi possível zerar o chaveamento.");
    },
  });

  const registrarResultado = useMutation({
    mutationFn: () =>
      partidaService.registrarResultado(partidaSelecionada!.id, {
        placarTimeA: Number(placarA),
        placarTimeB: Number(placarB),
      }),
    onSuccess: (partidaAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ["chaveamento", torneioId] });
      toast.success("Resultado registrado com sucesso.");
      fecharDialogResultado();

      if (partidaAtualizada.fase === "FINAL" && partidaAtualizada.vencedorId) {
        setCampeao(getTime(partidaAtualizada.vencedorId));
      }
    },
    onError: () => {
      toast.error("Não foi possível registrar o resultado.");
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
    setPlacarA("");
    setPlacarB("");
    setErroResultado(null);
  }

  function abrirAnimacaoPartida(partida: Partida) {
    setPartidaEmAnimacao(partida);
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
                className="text-destructive hover:text-destructive"
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
        <DialogContent>
          <form onSubmit={handleSubmitResultado}>
            <DialogHeader>
              <DialogTitle>Registrar resultado</DialogTitle>
              <DialogDescription>
                {partidaSelecionada &&
                  `${faseLabel[partidaSelecionada.fase]} — ${nomeTime(partidaSelecionada.timeAId)} x ${nomeTime(
                    partidaSelecionada.timeBId
                  )}`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="placar-a">{nomeTime(partidaSelecionada?.timeAId ?? null)}</Label>
                <Input
                  id="placar-a"
                  type="number"
                  min={0}
                  value={placarA}
                  onChange={(e) => setPlacarA(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placar-b">{nomeTime(partidaSelecionada?.timeBId ?? null)}</Label>
                <Input
                  id="placar-b"
                  type="number"
                  min={0}
                  value={placarB}
                  onChange={(e) => setPlacarB(e.target.value)}
                />
              </div>
            </div>

            {erroResultado && <p className="pb-2 text-sm text-destructive">{erroResultado}</p>}

            <DialogFooter>
              <Button type="submit" disabled={registrarResultado.isPending}>
                {registrarResultado.isPending ? "Salvando..." : "Salvar resultado"}
              </Button>
            </DialogFooter>
          </form>
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

      {partidaEmAnimacao && (
        <VersusOverlay
          timeA={getTime(partidaEmAnimacao.timeAId)}
          timeB={getTime(partidaEmAnimacao.timeBId)}
          ehFinal={partidaEmAnimacao.fase === "FINAL"}
          onConfirmar={(scoreA, scoreB) => {
            abrirDialogResultado(partidaEmAnimacao);
            setPlacarA(String(scoreA));
            setPlacarB(String(scoreB));
            setPartidaEmAnimacao(null);
          }}
        />
      )}

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
  const prontaParaJogar = partida.timeAId !== null && partida.timeBId !== null;
  const venceuA = finalizada && partida.vencedorId === partida.timeAId;
  const venceuB = finalizada && partida.vencedorId === partida.timeBId;
  const perdeuA = finalizada && !venceuA;
  const perdeuB = finalizada && !venceuB;

  return (
    <div
      className={`flex flex-col justify-center gap-1.5 rounded-md border bg-card px-2 py-2 shadow-sm ${
        destaque ? "text-base" : "text-sm"
      }`}
      style={{ height: destaque ? CARD_HEIGHT + 16 : CARD_HEIGHT }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <TeamAvatar time={timeA} apagado={perdeuA} destaque={destaque} />
        <span className={`min-w-0 flex-1 truncate text-right ${nomeClasse(venceuA)}`}>
          {timeA?.nome ?? "A definir"}
          {partida.placarTimeA !== null && <span className="ml-1.5 tabular-nums">{partida.placarTimeA}</span>}
        </span>

        <span className="shrink-0 text-xs text-muted-foreground">x</span>

        <span className={`min-w-0 flex-1 truncate ${nomeClasse(venceuB)}`}>
          {partida.placarTimeB !== null && <span className="mr-1.5 tabular-nums">{partida.placarTimeB}</span>}
          {timeB?.nome ?? "A definir"}
        </span>
        <TeamAvatar time={timeB} apagado={perdeuB} destaque={destaque} />
      </div>

      {!finalizada && prontaParaJogar && (
        <div className="flex items-center justify-center gap-2 text-[11px] font-medium">
          <button type="button" onClick={onIniciarPartida} className="text-muted-foreground hover:underline">
            Iniciar partida
          </button>
          <span className="text-muted-foreground/50">·</span>
          <button type="button" onClick={onRegistrarResultado} className="text-primary hover:underline">
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
        src={`${API_BASE_URL}${time.imagem}`}
        alt={time.nome}
        className={`${tamanho} shrink-0 rounded-sm border object-cover ${apagado ? "grayscale opacity-50" : ""}`}
      />
    );
  }

  return (
    <div
      className={`flex ${tamanho} shrink-0 items-center justify-center rounded-sm border border-dashed text-muted-foreground ${apagado ? "opacity-50" : ""}`}
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
