export async function decodificarAudio(file: File, contexto: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return contexto.decodeAudioData(arrayBuffer);
}

export function recortarAudioBuffer(
  contexto: AudioContext,
  buffer: AudioBuffer,
  inicioSegundos: number,
  duracaoSegundos: number
): AudioBuffer {
  const frameInicial = Math.max(0, Math.floor(inicioSegundos * buffer.sampleRate));
  const quantidadeFrames = Math.min(
    Math.floor(duracaoSegundos * buffer.sampleRate),
    buffer.length - frameInicial
  );

  const recorte = contexto.createBuffer(buffer.numberOfChannels, quantidadeFrames, buffer.sampleRate);

  for (let canal = 0; canal < buffer.numberOfChannels; canal++) {
    const dados = buffer.getChannelData(canal).subarray(frameInicial, frameInicial + quantidadeFrames);
    recorte.copyToChannel(dados, canal);
  }

  return recorte;
}

// codifica em WAV (PCM 16-bit) — simples e sem depender de nenhuma lib externa
export function audioBufferParaWav(buffer: AudioBuffer): Blob {
  const numeroCanais = buffer.numberOfChannels;
  const taxaAmostragem = buffer.sampleRate;
  const bytesPorAmostra = 2;
  const blockAlign = numeroCanais * bytesPorAmostra;
  const tamanhoDados = buffer.length * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + tamanhoDados);
  const view = new DataView(arrayBuffer);

  function escreverTexto(offset: number, texto: string) {
    for (let i = 0; i < texto.length; i++) {
      view.setUint8(offset + i, texto.charCodeAt(i));
    }
  }

  escreverTexto(0, "RIFF");
  view.setUint32(4, 36 + tamanhoDados, true);
  escreverTexto(8, "WAVE");
  escreverTexto(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numeroCanais, true);
  view.setUint32(24, taxaAmostragem, true);
  view.setUint32(28, taxaAmostragem * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  escreverTexto(36, "data");
  view.setUint32(40, tamanhoDados, true);

  const canais: Float32Array[] = [];
  for (let c = 0; c < numeroCanais; c++) {
    canais.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numeroCanais; c++) {
      const amostra = Math.max(-1, Math.min(1, canais[c][i]));
      view.setInt16(offset, amostra < 0 ? amostra * 0x8000 : amostra * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
