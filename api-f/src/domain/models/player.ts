// src/domain/interfaces/player.ts
export interface Player {
  _id: string;
  externalIds: { apiFootball?: number; sportmonks?: number };
  name: string;                    // antes: jugador
  position: 'GK' | 'DF' | 'MF' | 'FW';
  currentTeamId: string;           // antes: equipo (ahora es referencia)
  injured: boolean;
}

export interface PlayerSeasonStats {
  _id: string;
  playerId: string;
  teamId: string;
  competitionId: string;
  season: number;
  appearances: number;
  minutes: number;
  shots: number;
  shotsOnTarget: number;           // antes: tiros_arco (total)
}