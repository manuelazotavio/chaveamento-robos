import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { audioBufferParaWav, decodificarAudio, recortarAudioBuffer } from "@/lib/audio";

interface AudioCropperDialogProps {
  file: File | null;
  duracaoMaxima: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

function formatarSegundos(segundos: number) {
  return `${segundos.toFixed(1)}s`;
}

export function AudioCropperDialog({ file, duracaoMaxima, onCancel, onCropped }: AudioCropperDialogProps) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [inicio, setInicio] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const contextoRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!file) {
      setBuffer(null);
      setObjectUrl(null);
      setInicio(0);
      setErro(null);
      return;
    }

    let cancelado = false;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    const contexto = new AudioContext();
    contextoRef.current = contexto;

    decodificarAudio(file, contexto)
      .then((decodificado) => {
        if (cancelado) return;

        // já cabe dentro do limite — não precisa recortar nada, usa o arquivo original
        if (decodificado.duration <= duracaoMaxima + 0.05) {
          onCropped(file);
          return;
        }

        setBuffer(decodificado);
        setInicio(0);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível ler esse arquivo de áudio.");
      });

    return () => {
      cancelado = true;
      URL.revokeObjectURL(url);
      contexto.close();
    };
  }, [file, duracaoMaxima, onCropped]);

  function handlePreview() {
    const audio = audioRef.current;
    if (!audio) return;

    if (tocando) {
      audio.pause();
      setTocando(false);
      return;
    }

    audio.currentTime = inicio;
    audio.play();
    setTocando(true);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= inicio + duracaoMaxima) {
      audio.pause();
      setTocando(false);
    }
  }

  function handleConfirmar() {
    const contexto = contextoRef.current;
    if (!buffer || !contexto) return;

    const recorte = recortarAudioBuffer(contexto, buffer, inicio, duracaoMaxima);
    const blob = audioBufferParaWav(recorte);
    onCropped(blob);
  }

  const duracaoTotal = buffer?.duration ?? 0;
  const inicioMaximo = Math.max(0, duracaoTotal - duracaoMaxima);

  return (
    <Dialog open={!!file && (!!buffer || !!erro)} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cortar áudio</DialogTitle>
          <DialogDescription>
            {erro
              ? erro
              : `Esse áudio tem ${formatarSegundos(duracaoTotal)} — escolha um trecho de até ${duracaoMaxima}s.`}
          </DialogDescription>
        </DialogHeader>

        {buffer && (
          <div className="space-y-4 py-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={audioRef} src={objectUrl ?? undefined} className="hidden" onTimeUpdate={handleTimeUpdate} onPause={() => setTocando(false)} />

            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={inicioMaximo}
                step={0.01}
                value={inicio}
                onChange={(e) => setInicio(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <p className="text-sm text-muted-foreground">
                Trecho selecionado: {formatarSegundos(inicio)} – {formatarSegundos(inicio + duracaoMaxima)} de{" "}
                {formatarSegundos(duracaoTotal)}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
              {tocando ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {tocando ? "Parar" : "Ouvir trecho"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar} disabled={!buffer}>
            Usar trecho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
