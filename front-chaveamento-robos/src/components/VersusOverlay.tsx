import { useEffect, useRef, useState } from "react";
import { resolveArquivoUrl } from "@/services/api";
import type { Partida } from "@/types/partida";
import { partidaService } from "@/services/partidaService";
import { X, Radio, Keyboard, MoreVertical } from "lucide-react";

interface VersusTeam {
  nome: string;
  imagem: string | null;
  audioGol: string | null;
  audioVitoria: string | null;
}

function tocarAudio(caminho: string | null) {
  if (!caminho) return;
  new Audio(resolveArquivoUrl(caminho)).play().catch(() => {});
}

interface VersusOverlayProps {
  partida?: Partida | null;
  timeA: VersusTeam | null;
  timeB: VersusTeam | null;
  onConfirmar: (placarA: number, placarB: number) => void;
  onFechar?: () => void;
  ehFinal?: boolean;
  modo?: ModoControle;
  onModoChange?: (modo: ModoControle) => void;
}

export type Fase = "intro" | "contagem" | "vencedor";
export type ModoControle = "manual" | "automatico";

const DURACAO_VENCEDOR_MS = 10000;

// diferença >=2: quem tem mais fica verde e o outro vermelho; diferença de 1: os dois amarelos; empate: os dois cinza
function corPlacar(minha: number, outra: number) {
  const diferenca = minha - outra;
  if (diferenca === 0) return "text-zinc-300";
  if (Math.abs(diferenca) === 1) return "text-yellow-400";
  return diferenca > 0 ? "text-emerald-400" : "text-red-500";
}

export function getModoPartidaSalvo(partidaId?: number | null): ModoControle | null {
  if (!partidaId) return null;
  try {
    const salvo = localStorage.getItem(`modo_partida_${partidaId}`);
    if (salvo === "manual" || salvo === "automatico") {
      return salvo;
    }
  } catch {}
  return null;
}

export function salvarModoPartida(partidaId: number | null | undefined, modo: ModoControle) {
  if (!partidaId) return;
  try {
    localStorage.setItem(`modo_partida_${partidaId}`, modo);
  } catch {}
}

export function limparModoPartida(partidaId?: number | null) {
  if (!partidaId) return;
  try {
    localStorage.removeItem(`modo_partida_${partidaId}`);
  } catch {}
}

export function getPlacarManualSalvo(partidaId?: number | null): { placarA: number; placarB: number } | null {
  if (!partidaId) return null;
  try {
    const raw = localStorage.getItem(`placar_manual_partida_${partidaId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.placarA === "number" && typeof parsed?.placarB === "number") {
        return { placarA: parsed.placarA, placarB: parsed.placarB };
      }
    }
  } catch {}
  return null;
}

export function salvarPlacarManual(partidaId: number | null | undefined, placarA: number, placarB: number) {
  if (!partidaId) return;
  try {
    localStorage.setItem(
      `placar_manual_partida_${partidaId}`,
      JSON.stringify({ placarA, placarB })
    );
  } catch {}
}

export function limparPlacarManual(partidaId?: number | null) {
  if (!partidaId) return;
  try {
    localStorage.removeItem(`placar_manual_partida_${partidaId}`);
  } catch {}
}

export function VersusOverlay({
  partida,
  timeA,
  timeB,
  onConfirmar,
  onFechar,
  ehFinal = false,
  modo: modoProp,
  onModoChange,
}: VersusOverlayProps) {
  const modoSalvo = getModoPartidaSalvo(partida?.id);
  const modoInicial = modoSalvo ?? modoProp ?? "manual";
  const [fase, setFase] = useState<Fase>(partida?.status === "EM_ANDAMENTO" ? "contagem" : "intro");
  const [modoLocal, setModoLocal] = useState<ModoControle>(modoInicial);
  const modo = modoProp ?? modoLocal;

  // Placar manual recuperado do localStorage (se existir) ou inicial da partida
  const manualSalvoInicial = getPlacarManualSalvo(partida?.id);
  const placarManualRef = useRef<{ placarA: number; placarB: number }>(
    manualSalvoInicial ?? {
      placarA: partida?.placarTimeA ?? 0,
      placarB: partida?.placarTimeB ?? 0,
    }
  );

  // Placar automático recebido da API / simulação
  const placarAutoRef = useRef<{ placarA: number; placarB: number }>({
    placarA: partida?.placarTimeA ?? 0,
    placarB: partida?.placarTimeB ?? 0,
  });

  const [placarA, setPlacarA] = useState(() => {
    if (modoInicial === "manual" && manualSalvoInicial) {
      return manualSalvoInicial.placarA;
    }
    return partida?.placarTimeA ?? 0;
  });

  const [placarB, setPlacarB] = useState(() => {
    if (modoInicial === "manual" && manualSalvoInicial) {
      return manualSalvoInicial.placarB;
    }
    return partida?.placarTimeB ?? 0;
  });

  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmandoZerar, setConfirmandoZerar] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function finalizarPartida(scoreA: number, scoreB: number) {
    limparPlacarManual(partida?.id);
    limparModoPartida(partida?.id);
    onConfirmar(scoreA, scoreB);
  }

  function alterarModo(novoModo: ModoControle) {
    if (novoModo === modo) return;

    salvarModoPartida(partida?.id, novoModo);

    if (novoModo === "manual") {
      // Alternando de AUTOMÁTICO para MANUAL:
      // Preserva o placar automático que estava na tela
      placarAutoRef.current = { placarA, placarB };

      // Restaura o placar manual do localStorage ou ref
      const manualSalvo = getPlacarManualSalvo(partida?.id) ?? placarManualRef.current;
      placarManualRef.current = manualSalvo;
      setPlacarA(manualSalvo.placarA);
      setPlacarB(manualSalvo.placarB);
    } else {
      // Alternando de MANUAL para AUTOMÁTICO:
      // Apenas se estava no modo manual salva o placar manual atual no localStorage
      if (modo === "manual") {
        placarManualRef.current = { placarA, placarB };
        salvarPlacarManual(partida?.id, placarA, placarB);
      }

      // Troca imediatamente para o placar automático (mesmo que momentâneo até a API responder)
      const autoA = partida?.placarTimeA ?? placarAutoRef.current.placarA;
      const autoB = partida?.placarTimeB ?? placarAutoRef.current.placarB;
      setPlacarA(autoA);
      setPlacarB(autoB);
    }

    setModoLocal(novoModo);
    onModoChange?.(novoModo);
  }

  // Sincroniza modo se alterado externamente
  useEffect(() => {
    if (modoProp && modoProp !== modoLocal) {
      setModoLocal(modoProp);
    }
  }, [modoProp, modoLocal]);

  // Funções de ajuste de pontuação manual
  function handleIncrementarA() {
    if (modo !== "manual") return;
    setPlacarA((prevA) => {
      const novo = prevA + 1;
      placarManualRef.current.placarA = novo;
      salvarPlacarManual(partida?.id, novo, placarManualRef.current.placarB);
      return novo;
    });
    tocarAudio(timeA?.audioGol ?? null);
  }

  function handleDecrementarA() {
    if (modo !== "manual") return;
    setPlacarA((prevA) => {
      const novo = Math.max(0, prevA - 1);
      placarManualRef.current.placarA = novo;
      salvarPlacarManual(partida?.id, novo, placarManualRef.current.placarB);
      return novo;
    });
  }

  function handleIncrementarB() {
    if (modo !== "manual") return;
    setPlacarB((prevB) => {
      const novo = prevB + 1;
      placarManualRef.current.placarB = novo;
      salvarPlacarManual(partida?.id, placarManualRef.current.placarA, novo);
      return novo;
    });
    tocarAudio(timeB?.audioGol ?? null);
  }

  function handleDecrementarB() {
    if (modo !== "manual") return;
    setPlacarB((prevB) => {
      const novo = Math.max(0, prevB - 1);
      placarManualRef.current.placarB = novo;
      salvarPlacarManual(partida?.id, placarManualRef.current.placarA, novo);
      return novo;
    });
  }

  function handleZerarPlacar() {
    if (modo !== "manual") return;
    setPlacarA(0);
    setPlacarB(0);
    placarManualRef.current = { placarA: 0, placarB: 0 };
    salvarPlacarManual(partida?.id, 0, 0);
    setConfirmandoZerar(false);
    if (partida?.id) {
      partidaService.resetar(partida.id).catch(() => {});
    }
  }

  useEffect(() => {
    if (!menuAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
        setConfirmandoZerar(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [menuAberto]);

  // Sincronização em tempo real quando em modo automático
  useEffect(() => {
    if (!partida) return;

    if (partida.placarTimeA !== null) {
      placarAutoRef.current.placarA = partida.placarTimeA;
    }
    if (partida.placarTimeB !== null) {
      placarAutoRef.current.placarB = partida.placarTimeB;
    }

    if (modo === "automatico") {
      if (partida.placarTimeA !== null && partida.placarTimeA !== placarA) {
        if (partida.placarTimeA > placarA) {
          tocarAudio(timeA?.audioGol ?? null);
        }
        setPlacarA(partida.placarTimeA);
      }

      if (partida.placarTimeB !== null && partida.placarTimeB !== placarB) {
        if (partida.placarTimeB > placarB) {
          tocarAudio(timeB?.audioGol ?? null);
        }
        setPlacarB(partida.placarTimeB);
      }
    }

    // Se o simulador iniciou a partida externamente, avança a tela
    if (partida.status === "EM_ANDAMENTO" && fase === "intro") {
      setFase("contagem");
      if (modo !== "manual" && !modoSalvo) {
        alterarModo("automatico");
      }
    }

    // Se a partida foi finalizada pelo simulador na API
    if (partida.status === "FINALIZADA" && fase !== "vencedor") {
      if (ehFinal) {
        finalizarPartida(partida.placarTimeA ?? placarA, partida.placarTimeB ?? placarB);
      } else {
        setFase("vencedor");
      }
    }
  }, [partida, placarA, placarB, fase, ehFinal, onConfirmar, timeA, timeB, modo]);

  function handleIniciarContagem(modoEscolhido?: ModoControle) {
    if (modoEscolhido && modoEscolhido !== modo) {
      alterarModo(modoEscolhido);
    }
    setFase("contagem");
    if (partida && partida.status === "AGUARDANDO") {
      partidaService.iniciar(partida.id).catch(() => {});
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onFechar) {
        e.preventDefault();
        onFechar();
        return;
      }

      if (fase !== "contagem") return;

      if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (modo === "manual") {
          handleIncrementarA();
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (modo === "manual") {
          handleIncrementarB();
        }
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        if (modo === "manual") {
          handleDecrementarA();
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        // na final quem celebra é a tela de campeão — pula direto pro modal de resultado
        if (ehFinal) {
          finalizarPartida(placarA, placarB);
        } else {
          setFase("vencedor");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fase, ehFinal, placarA, placarB, onFechar, modo, timeA, timeB, partida]);

  const empate = placarA === placarB;
  const timeVencedor = placarA > placarB ? timeA : placarB > placarA ? timeB : null;

  useEffect(() => {
    if (fase !== "vencedor") return;
    const timer = setTimeout(() => finalizarPartida(placarA, placarB), DURACAO_VENCEDOR_MS);
    return () => clearTimeout(timer);
  }, [fase, placarA, placarB]);

  useEffect(() => {
    if (fase !== "vencedor" || !timeVencedor) return;
    tocarAudio(timeVencedor.audioVitoria);
    // toca só uma vez ao entrar na fase — não deve repetir a cada re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      <div className="absolute right-6 top-6 z-[110] flex items-center gap-2">
        {/* Menu discreto de opções e troca de modo */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuAberto((v) => !v);
              setConfirmandoZerar(false);
            }}
            title="Opções do duelo"
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition-all active:scale-95 ${
              menuAberto ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
            }`}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {menuAberto && (
            <div className="absolute right-0 top-12 z-[120] w-72 rounded-xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white font-sans text-xs animate-in fade-in zoom-in-95 duration-150">
              {/* Modo de Pontuação */}
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Modo de Pontuação
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => alterarModo("manual")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all ${
                      modo === "manual"
                        ? "bg-yellow-400 text-black font-bold shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => alterarModo("automatico")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all ${
                      modo === "automatico"
                        ? "bg-yellow-400 text-black font-bold shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Automático
                  </button>
                </div>
                <p className="text-[10px] text-white/40 mt-1.5 px-0.5">
                  {modo === "manual"
                    ? "Manual: pontuação controlada nas setas ou no menu."
                    : "Automático: sincroniza em tempo real com a API."}
                </p>
              </div>

              <div className="h-px bg-white/10 my-3" />

              {/* Ajuste de Placar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                    Ajustar Placar
                  </span>
                </div>

                {modo === "automatico" && (
                  <p className="text-[10px] text-amber-200/80 mb-2 leading-relaxed bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    O placar é atualizado automaticamente pela API. Para ajustar manualmente, mude para o modo <strong>Manual</strong> acima.
                  </p>
                )}

                {/* Time A */}
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="truncate max-w-[130px] font-medium" title={timeA?.nome}>
                    {timeA?.nome ?? "Time A"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={modo === "automatico"}
                      onClick={handleDecrementarA}
                      className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none"
                      title={modo === "automatico" ? "Desabilitado no modo automático" : "Diminuir ponto"}
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-bold">{placarA}</span>
                    <button
                      type="button"
                      disabled={modo === "automatico"}
                      onClick={handleIncrementarA}
                      className="h-6 w-6 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none"
                      title={modo === "automatico" ? "Desabilitado no modo automático" : "Adicionar ponto"}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Time B */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="truncate max-w-[130px] font-medium" title={timeB?.nome}>
                    {timeB?.nome ?? "Time B"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={modo === "automatico"}
                      onClick={handleDecrementarB}
                      className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none"
                      title={modo === "automatico" ? "Desabilitado no modo automático" : "Diminuir ponto"}
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-bold">{placarB}</span>
                    <button
                      type="button"
                      disabled={modo === "automatico"}
                      onClick={handleIncrementarB}
                      className="h-6 w-6 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none"
                      title={modo === "automatico" ? "Desabilitado no modo automático" : "Adicionar ponto"}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/10 my-3" />

              {modo === "automatico" ? (
                <div className="text-center py-1 text-[10px] text-white/30 italic">
                  Zerar placar indisponível no modo automático
                </div>
              ) : confirmandoZerar ? (
                <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 animate-in fade-in duration-100">
                  <span className="text-[11px] text-red-200 text-center font-medium">
                    Tem certeza que deseja zerar o placar?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmandoZerar(false)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleZerarPlacar}
                      className="flex-1 py-1 rounded bg-red-600 hover:bg-red-500 text-[11px] font-bold text-white transition-colors shadow"
                    >
                      Sim, zerar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoZerar(true)}
                  className="w-full text-center py-1.5 rounded-md text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Zerar placar
                </button>
              )}
            </div>
          )}
        </div>

        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            title="Fechar duelo (Esc)"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes vs-slide-left {
          from { transform: translateX(-130%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes vs-slide-right {
          from { transform: translateX(130%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes vs-pop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          55% { transform: scale(1.35) rotate(6deg); opacity: 1; }
          75% { transform: scale(0.92) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vs-flash {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes vs-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes vs-drop {
          0% { transform: translateY(-60px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes vs-winner-pop {
          0% { transform: scale(0.2); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes vs-glow-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
        @keyframes vs-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .vs-fighter-left { animation: vs-slide-left 0.55s cubic-bezier(0.2, 0.85, 0.3, 1) both; }
        .vs-fighter-right { animation: vs-slide-right 0.55s cubic-bezier(0.2, 0.85, 0.3, 1) both; }
        .vs-title { animation: vs-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both; }
        .vs-flash { animation: vs-flash 0.5s ease-out 0.45s both; }
        .vs-hint { animation: vs-blink 1.2s ease-in-out infinite; }
        .vs-headline { animation: vs-drop 0.5s cubic-bezier(0.2, 0.85, 0.3, 1) both; }
        .vs-button { animation: vs-drop 0.5s cubic-bezier(0.2, 0.85, 0.3, 1) 0.7s both; }
        .vs-winner-pop { animation: vs-winner-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .vs-winner-glow { animation: vs-glow-pulse 1.6s ease-in-out infinite; }
        .vs-progress { animation: vs-progress ${DURACAO_VENCEDOR_MS}ms linear forwards; }
      `}</style>

      <div className="absolute inset-0 flex">
        <div
          className="w-1/2 bg-gradient-to-br from-sky-950 via-blue-900 to-black"
          style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 0% 100%)" }}
        />
        <div
          className="w-1/2 bg-gradient-to-bl from-rose-950 via-red-900 to-black"
          style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0% 100%)" }}
        />
      </div>

      {fase !== "vencedor" ? (
        <>
          <div className="vs-flash pointer-events-none absolute inset-0 bg-white" />

          <div className="vs-headline absolute left-1/2 top-6 -translate-x-1/2 flex flex-col items-center gap-1 z-[105]">
            <h1 className="whitespace-nowrap text-center text-xl font-black italic uppercase tracking-[0.3em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-2xl">
              Duelo de Times {partida ? `• Partida #${partida.id}` : ""}
            </h1>
            {fase === "contagem" && modo === "automatico" && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                <Radio className="h-3 w-3" />
                AO VIVO
              </span>
            )}
          </div>

          <div className="relative flex h-full flex-col items-center justify-center gap-10 px-6 sm:flex-row sm:gap-4">
            {/* Time A */}
            <div className="vs-fighter-left flex flex-1 flex-col items-center gap-3">
              <VersusAvatar time={timeA} />
              <span className="max-w-full truncate text-center text-2xl font-black italic uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-4xl">
                {timeA?.nome ?? "A definir"}
              </span>
              {fase === "contagem" && (
                <>
                  <span className={`text-6xl font-black tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-7xl ${corPlacar(placarA, placarB)}`}>
                    {placarA}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 sm:text-xs">
                    Pontuação atual
                  </span>
                </>
              )}
            </div>

            {/* Centro VS */}
            <div className="vs-title z-10 flex shrink-0 flex-col items-center gap-6 px-2">
              <span className="text-7xl font-black italic leading-none text-yellow-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] sm:text-8xl">
                VS
              </span>
              {fase === "intro" && (
                <button
                  type="button"
                  onClick={() => handleIniciarContagem()}
                  className="vs-button rounded-md border-2 border-yellow-400 bg-black/40 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black sm:text-base shadow-lg"
                >
                  Iniciar partida
                </button>
              )}
            </div>

            {/* Time B */}
            <div className="vs-fighter-right flex flex-1 flex-col items-center gap-3">
              <VersusAvatar time={timeB} />
              <span className="max-w-full truncate text-center text-2xl font-black italic uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-4xl">
                {timeB?.nome ?? "A definir"}
              </span>
              {fase === "contagem" && (
                <>
                  <span className={`text-6xl font-black tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-7xl ${corPlacar(placarB, placarA)}`}>
                    {placarB}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 sm:text-xs">
                    Pontuação atual
                  </span>
                </>
              )}
            </div>
          </div>

          {fase === "contagem" && (
            <p className="vs-hint absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.35em] text-white/80 sm:text-sm">
              {modo === "manual"
                ? "← ponto time A · espaço para finalizar · ponto time B →"
                : "📡 sincronizando via API · espaço para finalizar"}
            </p>
          )}
        </>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6">
          <div className="vs-winner-glow pointer-events-none absolute h-72 w-72 rounded-full bg-yellow-400/40 blur-3xl sm:h-96 sm:w-96" />

          <span className="vs-winner-pop text-xl font-black uppercase italic tracking-[0.35em] text-yellow-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-3xl">
            {empate ? "Empate" : "Vencedor"}
          </span>

          {!empate && timeVencedor && (
            <>
              <div className="vs-winner-pop relative">
                <VersusAvatar time={timeVencedor} grande />
              </div>
              <span className="vs-winner-pop max-w-full truncate text-center text-3xl font-black italic uppercase text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-5xl">
                {timeVencedor.nome}
              </span>
            </>
          )}

          <span className="text-lg font-bold tabular-nums text-white/80 sm:text-xl">
            {placarA} x {placarB}
          </span>

          <div className="mt-2 h-1 w-64 overflow-hidden rounded-full bg-white/20">
            <div className="vs-progress h-full bg-yellow-400" />
          </div>
        </div>
      )}
    </div>
  );
}

function VersusAvatar({ time, grande = false }: { time: VersusTeam | null; grande?: boolean }) {
  const tamanho = grande ? "h-48 w-48 sm:h-64 sm:w-64" : "h-32 w-32 sm:h-48 sm:w-48";

  if (time?.imagem) {
    return (
      <img
        src={resolveArquivoUrl(time.imagem)}
        alt={time.nome}
        className={`${tamanho} rounded-md border-4 border-white object-cover shadow-2xl`}
      />
    );
  }

  return (
    <div className={`flex ${tamanho} items-center justify-center rounded-md border-4 border-dashed border-white/50 text-4xl font-black text-white/50`}>
      ?
    </div>
  );
}
