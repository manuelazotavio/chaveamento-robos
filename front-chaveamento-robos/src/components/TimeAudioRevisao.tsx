import { ChangeEvent, useRef, useState } from "react";
import { Music, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioCropperDialog } from "@/components/AudioCropperDialog";
import { resolveArquivoUrl } from "@/services/api";

interface TimeAudioRevisaoProps {
  label: string;
  audioUrl?: string | null;
  duracaoMaxima: number;
  editavel: boolean;
  enviando: boolean;
  onSubstituir: (file: File) => void;
}

// player do audio ja enviado + botao pra trocar (com o mesmo cropper do
// cadastro), usado na tela de detalhes pro admin ouvir e ajustar antes de aprovar
export function TimeAudioRevisao({
  label,
  audioUrl,
  duracaoMaxima,
  editavel,
  enviando,
  onSubstituir,
}: TimeAudioRevisaoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendencia, setPendencia] = useState<File | null>(null);

  function handleSelecionar(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (arquivo) setPendencia(arquivo);
  }

  function handleCropped(blob: Blob) {
    setPendencia(null);
    onSubstituir(new File([blob], "audio.wav", { type: blob.type || "audio/wav" }));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {editavel && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {enviando ? "Enviando..." : audioUrl ? "Trocar/recortar" : "Enviar áudio"}
            </Button>
            <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleSelecionar} />
          </>
        )}
      </div>

      {audioUrl ? (
        <audio controls src={resolveArquivoUrl(audioUrl)} className="w-full" />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music className="h-3.5 w-3.5" />
          Nenhum áudio enviado.
        </p>
      )}

      <AudioCropperDialog
        file={pendencia}
        duracaoMaxima={duracaoMaxima}
        onCancel={() => setPendencia(null)}
        onCropped={handleCropped}
      />
    </div>
  );
}
