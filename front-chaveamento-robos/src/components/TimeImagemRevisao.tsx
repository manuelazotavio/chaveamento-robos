import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";
import { resolveArquivoUrl } from "@/services/api";

interface TimeImagemRevisaoProps {
  imagemUrl?: string | null;
  nomeTime: string;
  editavel: boolean;
  enviando: boolean;
  onSubstituir: (file: File) => void;
}

export function TimeImagemRevisao({
  imagemUrl,
  nomeTime,
  editavel,
  enviando,
  onSubstituir,
}: TimeImagemRevisaoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendencia, setPendencia] = useState<File | null>(null);
  const [versao, setVersao] = useState(Date.now());

  useEffect(() => {
    setVersao(Date.now());
  }, [imagemUrl]);

  function handleSelecionar(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (arquivo) setPendencia(arquivo);
  }

  function handleCropped(blob: Blob) {
    setPendencia(null);
    onSubstituir(new File([blob], "time.jpg", { type: "image/jpeg" }));
  }

  const urlBase = resolveArquivoUrl(imagemUrl);
  const srcFinal = urlBase ? `${urlBase}${urlBase.includes("?") ? "&" : "?"}t=${versao}` : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="group relative">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {srcFinal ? (
            <img
              src={srcFinal}
              alt={nomeTime}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Users className="h-10 w-10" />
            </div>
          )}
        </div>

        {editavel && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 disabled:pointer-events-none"
            aria-label="Alterar foto do time"
          >
            {enviando ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <span className="text-xs font-medium">
              {enviando ? "Enviando..." : "Alterar foto"}
            </span>
          </button>
        )}
      </div>

      {editavel && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : imagemUrl ? (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {enviando ? "Enviando foto..." : imagemUrl ? "Trocar foto" : "Adicionar foto"}
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelecionar}
          />
        </div>
      )}

      <ImageCropperDialog
        file={pendencia}
        onCancel={() => setPendencia(null)}
        onCropped={handleCropped}
      />
    </div>
  );
}
