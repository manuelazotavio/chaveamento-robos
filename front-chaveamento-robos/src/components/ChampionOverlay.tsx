import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { resolveArquivoUrl } from "@/services/api";

interface ChampionTeam {
  nome: string;
  imagem: string | null;
  audioVitoria: string | null;
}

interface ChampionOverlayProps {
  time: ChampionTeam;
  onClose: () => void;
}

export function ChampionOverlay({ time, onClose }: ChampionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!time.audioVitoria) return;
    const audio = new Audio(resolveArquivoUrl(time.audioVitoria));
    audio.play().catch(() => {});
    return () => audio.pause();
    // toca só uma vez quando o campeão é revelado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const disparar = confetti.create(canvas, { resize: true, useWorker: true });
    const cores = ["#facc15", "#fde047", "#fbbf24", "#ffffff"];

    disparar({ particleCount: 160, spread: 100, startVelocity: 55, origin: { y: 0.4 }, colors: cores });

    const intervalo = window.setInterval(() => {
      disparar({ particleCount: 40, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: cores });
      disparar({ particleCount: 40, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: cores });
    }, 900);

    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-black">
      <style>{`
        @keyframes champ-bg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        @keyframes champ-rays-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes champ-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes champ-photo-pop {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          55% { transform: scale(1.2) rotate(6deg); opacity: 1; }
          75% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes champ-title-in {
          0% { transform: scale(2) translateY(40px); opacity: 0; letter-spacing: 0.6em; }
          100% { transform: scale(1) translateY(0); opacity: 1; letter-spacing: 0.15em; }
        }
        @keyframes champ-shine {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes champ-name-in {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes champ-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes champ-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .champ-bg-pulse { animation: champ-bg-pulse 2.5s ease-in-out infinite; }
        .champ-rays { animation: champ-rays-spin 22s linear infinite; }
        .champ-ring { animation: champ-ring-spin 9s linear infinite; }
        .champ-photo { animation: champ-photo-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both, champ-float 3.5s ease-in-out 1.2s infinite; }
        .champ-title { animation: champ-title-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .champ-shine { animation: champ-shine 2.6s ease-in-out 1.4s infinite; }
        .champ-name { animation: champ-name-in 0.6s ease-out 0.9s both; }
        .champ-hint { animation: champ-blink 1.4s ease-in-out infinite; }
      `}</style>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

      <div className="champ-bg-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.35),rgba(0,0,0,0.95)_65%)]" />

      <div
        className="champ-rays pointer-events-none absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 opacity-30"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(250,204,21,0.5) 0deg 6deg, transparent 6deg 18deg)",
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="champ-title relative overflow-hidden whitespace-nowrap text-3xl font-black uppercase italic text-yellow-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] sm:text-6xl">
          <span className="relative z-10">Campeão do Torneio</span>
          <span className="champ-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-sm" />
        </h1>

        <div className="relative flex items-center justify-center py-4">
          <div className="champ-ring absolute h-56 w-56 rounded-full border-4 border-dashed border-yellow-400/70 sm:h-72 sm:w-72" />
          <Trophy className="absolute -top-8 h-12 w-12 text-yellow-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] sm:-top-10 sm:h-16 sm:w-16" />
          <ChampionAvatar time={time} />
        </div>

        <span className="champ-name max-w-full truncate text-4xl font-black italic uppercase text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] sm:text-6xl">
          {time.nome}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-md border-2 border-yellow-400 bg-black/50 px-6 py-2 text-sm font-black uppercase tracking-widest text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black sm:text-base"
        >
          Fechar
        </button>

        <p className="champ-hint absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.35em] text-white/70 sm:text-sm">
          Pressione ESPAÇO para fechar
        </p>
      </div>
    </div>
  );
}

function ChampionAvatar({ time }: { time: ChampionTeam }) {
  if (time.imagem) {
    return (
      <img
        src={resolveArquivoUrl(time.imagem)}
        alt={time.nome}
        className="champ-photo relative z-10 h-40 w-40 rounded-md border-4 border-yellow-400 object-cover shadow-[0_0_40px_rgba(250,204,21,0.6)] sm:h-56 sm:w-56"
      />
    );
  }

  return (
    <div className="champ-photo relative z-10 flex h-40 w-40 items-center justify-center rounded-md border-4 border-dashed border-yellow-400/70 text-5xl font-black text-yellow-400/70 shadow-[0_0_40px_rgba(250,204,21,0.4)] sm:h-56 sm:w-56">
      ?
    </div>
  );
}
