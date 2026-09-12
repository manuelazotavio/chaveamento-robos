import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Music, X } from "lucide-react";
import { toast } from "sonner";
import { timeService } from "@/services/timeService";
import { torneioService } from "@/services/torneioService";
import type { EnumTime, Time } from "@/types/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";
import { AudioCropperDialog } from "@/components/AudioCropperDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tipoLabel: Record<EnumTime, string> = {
  ROBOCODE: "RoboCode",
  ROBOSOCCER: "RoboSoccer",
};

interface TimeCadastroFormProps {
  onSuccess?: (time: Time) => void;
  submitLabel?: string;
}

// formulário de cadastro de time, usado tanto no modal de admin (Times.tsx)
// quanto na tela pública de inscrição — cria o time (que nasce PENDENTE,
// aguardando aprovação) e opcionalmente já inscreve no torneio da categoria
export function TimeCadastroForm({ onSuccess, submitLabel = "Cadastrar" }: TimeCadastroFormProps) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<EnumTime | "">("");
  const [arquivoParaRecorte, setArquivoParaRecorte] = useState<File | null>(null);
  const [imagemRecortada, setImagemRecortada] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const [audioGol, setAudioGol] = useState<File | null>(null);
  const [audioVitoria, setAudioVitoria] = useState<File | null>(null);
  const [pendenciaAudioGol, setPendenciaAudioGol] = useState<File | null>(null);
  const [pendenciaAudioVitoria, setPendenciaAudioVitoria] = useState<File | null>(null);

  // times/torneios exigem login no backend — para visitante anônimo (tela
  // pública) essas consultas simplesmente falham e os dados ficam undefined,
  // então o form segue sem checagem de duplicidade nem auto-inscrição
  const { data: times } = useQuery({ queryKey: ["times"], queryFn: timeService.listar, retry: false });
  const { data: torneios } = useQuery({ queryKey: ["torneios"], queryFn: torneioService.listar, retry: false });

  useEffect(() => {
    if (!imagemRecortada) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imagemRecortada);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imagemRecortada]);

  function removerImagem() {
    setImagemRecortada(null);
    if (inputImagemRef.current) inputImagemRef.current.value = "";
  }

  function handleSelecionarAudioGol(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (arquivo) setPendenciaAudioGol(arquivo);
  }

  function handleSelecionarAudioVitoria(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (arquivo) setPendenciaAudioVitoria(arquivo);
  }

  // referências estáveis: como entram nas deps do efeito de decodificação do
  // AudioCropperDialog, recriar essas funções a cada digitação no formulário
  // fazia o cropper reiniciar a decodificação do áudio toda hora
  const cancelarCorteAudioGol = useCallback(() => setPendenciaAudioGol(null), []);
  const confirmarCorteAudioGol = useCallback((blob: Blob) => {
    setAudioGol(new File([blob], "gol.wav", { type: blob.type || "audio/wav" }));
    setPendenciaAudioGol(null);
  }, []);
  const cancelarCorteAudioVitoria = useCallback(() => setPendenciaAudioVitoria(null), []);
  const confirmarCorteAudioVitoria = useCallback((blob: Blob) => {
    setAudioVitoria(new File([blob], "vitoria.wav", { type: blob.type || "audio/wav" }));
    setPendenciaAudioVitoria(null);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !tipo) {
      setErro("Preencha o nome e a categoria do time.");
      return;
    }

    const nomeDuplicado = times?.some(
      (t) => t.tipo === tipo && t.nome.trim().toLowerCase() === nome.trim().toLowerCase()
    );
    if (nomeDuplicado) {
      setErro("Já existe um time com esse nome nessa categoria.");
      return;
    }

    setErro(null);
    setSalvando(true);

    let time;
    try {
      time = await timeService.criar({ nome: nome.trim(), tipo });
    } catch {
      toast.error("Não foi possível cadastrar o time.");
      setSalvando(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["times"] });

    // ao cadastrar o time já inscreve automaticamente no torneio da mesma categoria
    // (como só existe um torneio por categoria, escolher a categoria já basta)
    const torneioDaCategoria =
      torneios?.find((t) => t.tipo === tipo && t.status === "INSCRICOES") ??
      torneios?.find((t) => t.tipo === tipo);

    let inscrito = false;
    if (torneioDaCategoria) {
      try {
        await torneioService.inscreverTime(torneioDaCategoria.id, time.id);
        queryClient.invalidateQueries({ queryKey: ["torneio-times", torneioDaCategoria.id] });
        inscrito = true;
      } catch {
        // segue sem travar o cadastro — o botão "Inscrever" na tela de Torneios cobre esse caso
      }
    }

    const falhas: string[] = [];

    if (imagemRecortada) {
      try {
        const arquivo = new File([imagemRecortada], "time.jpg", { type: "image/jpeg" });
        await timeService.uploadImagem(time.id, arquivo);
      } catch {
        falhas.push("imagem");
      }
    }

    if (audioGol) {
      try {
        await timeService.uploadAudioGol(time.id, audioGol);
      } catch {
        falhas.push("áudio de gol");
      }
    }

    if (audioVitoria) {
      try {
        await timeService.uploadAudioVitoria(time.id, audioVitoria);
      } catch {
        falhas.push("áudio de vitória");
      }
    }

    queryClient.invalidateQueries({ queryKey: ["times"] });

    if (falhas.length > 0) {
      toast.error(`Time enviado para aprovação, mas houve falha ao salvar: ${falhas.join(", ")}.`);
    } else if (inscrito) {
      toast.success(`Time enviado para aprovação e inscrito no torneio de ${tipoLabel[tipo]}.`);
    } else {
      toast.success("Time enviado para aprovação.");
    }

    setSalvando(false);
    onSuccess?.(time);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do time</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: IFSP Robotics"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Categoria</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as EnumTime)}>
          <SelectTrigger id="tipo">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ROBOCODE">RoboCode</SelectItem>
            <SelectItem value="ROBOSOCCER">RoboSoccer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="imagem">Imagem do time (opcional)</Label>
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <div className="relative h-16 w-16 shrink-0">
              <button
                type="button"
                onClick={() => inputImagemRef.current?.click()}
                className="block h-16 w-16 cursor-pointer overflow-hidden rounded-md border"
              >
                <img src={previewUrl} alt="Miniatura do time" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={removerImagem}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
                aria-label="Remover imagem"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputImagemRef.current?.click()}
              className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              aria-label="Escolher imagem do time"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}

          <Input
            id="imagem"
            ref={inputImagemRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setArquivoParaRecorte(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Áudio de gol (opcional, até 2s — recorte se for maior)</Label>
        <AudioPicker arquivo={audioGol} onSelecionar={handleSelecionarAudioGol} onRemover={() => setAudioGol(null)} />
      </div>

      <div className="space-y-2">
        <Label>Áudio de vitória (opcional, até 10s — recorte se for maior)</Label>
        <AudioPicker
          arquivo={audioVitoria}
          onSelecionar={handleSelecionarAudioVitoria}
          onRemover={() => setAudioVitoria(null)}
        />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button type="submit" disabled={salvando} className="w-full">
        {salvando ? "Enviando..." : submitLabel}
      </Button>

      <ImageCropperDialog
        file={arquivoParaRecorte}
        onCancel={() => {
          setArquivoParaRecorte(null);
          if (inputImagemRef.current) inputImagemRef.current.value = "";
        }}
        onCropped={(blob) => {
          setImagemRecortada(blob);
          setArquivoParaRecorte(null);
        }}
      />

      <AudioCropperDialog
        file={pendenciaAudioGol}
        duracaoMaxima={2}
        onCancel={cancelarCorteAudioGol}
        onCropped={confirmarCorteAudioGol}
      />

      <AudioCropperDialog
        file={pendenciaAudioVitoria}
        duracaoMaxima={10}
        onCancel={cancelarCorteAudioVitoria}
        onCropped={confirmarCorteAudioVitoria}
      />
    </form>
  );
}

interface AudioPickerProps {
  arquivo: File | null;
  onSelecionar: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemover: () => void;
}

function AudioPicker({ arquivo, onSelecionar, onRemover }: AudioPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Music className="h-3.5 w-3.5" />
        {arquivo ? "Trocar áudio" : "Selecionar áudio"}
      </Button>

      {arquivo && previewUrl && (
        <>
          <audio controls src={previewUrl} className="h-8 max-w-[180px]" />
          <button
            type="button"
            onClick={onRemover}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remover áudio"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}

      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={onSelecionar} />
    </div>
  );
}
