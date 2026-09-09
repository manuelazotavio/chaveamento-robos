import { PointerEvent, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VIEWPORT = 280;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

interface ImageCropperDialogProps {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export function ImageCropperDialog({ file, onCancel, onCropped }: ImageCropperDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ left: 0, top: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function baseScale(width: number, height: number) {
    if (!width || !height) return 1;
    return Math.max(VIEWPORT / width, VIEWPORT / height);
  }

  function clamp(left: number, top: number, effectiveScale: number, width: number, height: number) {
    const displayedWidth = width * effectiveScale;
    const displayedHeight = height * effectiveScale;
    const minLeft = Math.min(0, VIEWPORT - displayedWidth);
    const minTop = Math.min(0, VIEWPORT - displayedHeight);
    return {
      left: Math.min(0, Math.max(left, minLeft)),
      top: Math.min(0, Math.max(top, minTop)),
    };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    setNatural({ width, height });

    const scale = baseScale(width, height);
    const left = (VIEWPORT - width * scale) / 2;
    const top = (VIEWPORT - height * scale) / 2;
    setOffset({ left, top });
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: offset.left, startTop: offset.top };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !natural.width) return;
    const effectiveScale = baseScale(natural.width, natural.height) * zoom;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clamp(
      dragRef.current.startLeft + dx,
      dragRef.current.startTop + dy,
      effectiveScale,
      natural.width,
      natural.height
    );
    setOffset(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoomChange(novoZoom: number) {
    if (!natural.width) {
      setZoom(novoZoom);
      return;
    }
    const scale = baseScale(natural.width, natural.height);
    const oldEffective = scale * zoom;
    const newEffective = scale * novoZoom;

    // mantém o ponto do centro do viewport fixo na imagem ao dar zoom
    const centerImageX = (VIEWPORT / 2 - offset.left) / oldEffective;
    const centerImageY = (VIEWPORT / 2 - offset.top) / oldEffective;
    const newLeft = VIEWPORT / 2 - centerImageX * newEffective;
    const newTop = VIEWPORT / 2 - centerImageY * newEffective;

    setZoom(novoZoom);
    setOffset(clamp(newLeft, newTop, newEffective, natural.width, natural.height));
  }

  function handleConfirmar() {
    const img = imgRef.current;
    if (!img || !natural.width) return;

    const effectiveScale = baseScale(natural.width, natural.height) * zoom;
    const sx = -offset.left / effectiveScale;
    const sy = -offset.top / effectiveScale;
    const sSize = VIEWPORT / effectiveScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        if (blob) onCropped(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <Dialog open={!!file} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar imagem</DialogTitle>
          <DialogDescription>Arraste para posicionar e use o zoom para recortar a imagem em 1:1.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="relative touch-none overflow-hidden rounded-md border bg-muted select-none"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                onLoad={handleImageLoad}
                draggable={false}
                alt="Pré-visualização para recorte"
                className="absolute max-w-none cursor-move"
                style={{
                  left: offset.left,
                  top: offset.top,
                  width: natural.width * baseScale(natural.width, natural.height) * zoom,
                  height: natural.height * baseScale(natural.width, natural.height) * zoom,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-border/50" />
          </div>

          <div className="flex w-full items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar}>
            Usar imagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
