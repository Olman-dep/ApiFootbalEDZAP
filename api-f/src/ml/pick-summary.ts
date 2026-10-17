import type { MatchProbabilities } from './poisson.service.js';

export type PickSide = 'HOME' | 'DRAW' | 'AWAY';

export interface PickSummaryInput {
  probs: MatchProbabilities;
  homeCode: string;
  awayCode: string;
  // pickSummary que el partido ya tenía (su cuota es la única cuota de mercado disponible hoy).
  existing?: { pick?: string; odds?: number } | null;
}

export interface PickSummaryResult {
  pick: PickSide;
  pickCode: string;
  odds: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  maxEV: number;
  hasValue: boolean;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Resumen del pick del modelo para `matches.pickSummary`.
 *
 * Todavía no hay cuotas de mercado (odds_snapshots llega más adelante). Mientras
 * tanto, solo se reutiliza la cuota que el partido ya tenía si corresponde al
 * mismo pick; en cualquier otro caso `odds` queda en 0, `maxEV` en 0 y
 * `hasValue` en false, porque sin cuota no se puede afirmar que haya valor.
 */
export function buildPickSummary(input: PickSummaryInput): PickSummaryResult {
  const { probs, homeCode, awayCode, existing } = input;

  let pick: PickSide = 'HOME';
  let prob = probs.homeWin;
  if (probs.draw > prob) {
    pick = 'DRAW';
    prob = probs.draw;
  }
  if (probs.awayWin > prob) {
    pick = 'AWAY';
    prob = probs.awayWin;
  }

  const pickCode = pick === 'HOME' ? homeCode : pick === 'AWAY' ? awayCode : 'X';

  const existingOdds = existing?.odds ?? 0;
  const odds = existing?.pick === pick && existingOdds > 0 ? existingOdds : 0;
  const maxEV = odds > 0 ? round3(prob * odds - 1) : 0;

  return {
    pick,
    pickCode,
    odds,
    homeWinProb: round3(probs.homeWin),
    drawProb: round3(probs.draw),
    awayWinProb: round3(probs.awayWin),
    maxEV,
    hasValue: maxEV > 0,
  };
}
