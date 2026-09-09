export type FasePartida = "OITAVAS" | "QUARTAS" | "SEMIFINAL" | "FINAL";

export type StatusPartida = "AGUARDANDO" | "EM_ANDAMENTO" | "FINALIZADA";

export interface Partida {
  id: number;
  fase: FasePartida;
  status: StatusPartida;
  torneioId: number;
  timeAId: number | null;
  timeBId: number | null;
  placarTimeA: number | null;
  placarTimeB: number | null;
  vencedorId: number | null;
  proximaPartidaId: number | null;
}

export interface ResultadoPartidaRequest {
  placarTimeA: number;
  placarTimeB: number;
}
