import { useEffect, useState } from "react";
import { resolveArquivoUrl } from "@/services/api";

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
  timeA: VersusTeam | null;
  timeB: VersusTeam | null;
  onConfirmar: (placarA: number, placarB: number) => void;
  ehFinal?: boolean;
}

type Fase = "intro" | "contagem" | "vencedor";

const DURACAO_VENCEDOR_MS = 10000;

// diferença >=2: quem tem mais fica verde e o outro vermelho; diferença de 1: os dois amarelos; empate: os dois cinza
function corPlacar(minha: number, outra: number) {
  const diferenca = minha - outra;
  if (diferenca === 0) return "text-zinc-300";
  if (Math.abs(diferenca) === 1) return "text-yellow-400";
  return diferenca > 0 ? "text-emerald-400" : "text-red-500";
}

export function VersusOverlay({ timeA, timeB, onConfirmar, ehFinal = false }: VersusOverlayProps) {
  const [fase, setFase] = useState<Fase>("intro");
  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);

  useEffect(() => {
    if (fase !== "contagem") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        setPlacarA((v) => v + 1);
        tocarAudio(timeA?.audioGol ?? null);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setPlacarB((v) => v + 1);
        tocarAudio(timeB?.audioGol ?? null);
      } else if (e.code === "Space") {
        e.preventDefault();
        // na final quem celebra é a tela de campeão — pula direto pro modal de resultado
        if (ehFinal) {
          onConfirmar(placarA, placarB);
        } else {
          setFase("vencedor");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fase, ehFinal, placarA, placarB, onConfirmar, timeA, timeB]);

  const empate = placarA === placarB;
  const timeVencedor = placarA > placarB ? timeA : placarB > placarA ? timeB : null;

  useEffect(() => {
    if (fase !== "vencedor") return;
    const timer = setTimeout(() => onConfirmar(placarA, placarB), DURACAO_VENCEDOR_MS);
    return () => clearTimeout(timer);
  }, [fase, placarA, placarB, onConfirmar]);

  useEffect(() => {
    if (fase !== "vencedor" || !timeVencedor) return;
    tocarAudio(timeVencedor.audioVitoria);
    // toca só uma vez ao entrar na fase — não deve repetir a cada re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
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

          <h1 className="vs-headline absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap text-center text-xl font-black italic uppercase tracking-[0.3em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-2xl">
            Duelo de Times
          </h1>

          <div className="relative flex h-full flex-col items-center justify-center gap-10 px-6 sm:flex-row sm:gap-4">
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

            <div className="vs-title z-10 flex shrink-0 flex-col items-center gap-6 px-2">
              <span className="text-7xl font-black italic leading-none text-yellow-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] sm:text-8xl">
                VS
              </span>
              {fase === "intro" && (
                <button
                  type="button"
                  onClick={() => setFase("contagem")}
                  className="vs-button rounded-md border-2 border-yellow-400 bg-black/40 px-6 py-2 text-sm font-black uppercase tracking-widest text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black sm:text-base"
                >
                  Iniciar partida
                </button>
              )}
            </div>

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
            <p className="vs-hint absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.35em] text-white/80 sm:text-sm">
              ← ponto da esquerda - espaço para registrar - ponto da direita →
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
