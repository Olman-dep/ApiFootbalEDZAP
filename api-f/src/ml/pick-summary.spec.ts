import { buildPickSummary } from './pick-summary.js';

const probs = { homeWin: 0.55, draw: 0.25, awayWin: 0.2 };

describe('buildPickSummary', () => {
  it('elige el resultado más probable y usa el código del equipo', () => {
    const result = buildPickSummary({ probs, homeCode: 'RIV', awayCode: 'BOC' });

    expect(result.pick).toBe('HOME');
    expect(result.pickCode).toBe('RIV');
    expect(result.homeWinProb).toBe(0.55);
    expect(result.drawProb).toBe(0.25);
    expect(result.awayWinProb).toBe(0.2);
  });

  it('usa X como código cuando el pick es empate', () => {
    const result = buildPickSummary({
      probs: { homeWin: 0.3, draw: 0.4, awayWin: 0.3 },
      homeCode: 'RIV',
      awayCode: 'BOC',
    });

    expect(result.pick).toBe('DRAW');
    expect(result.pickCode).toBe('X');
  });

  it('sin cuota previa deja odds, maxEV y hasValue en neutro', () => {
    const result = buildPickSummary({ probs, homeCode: 'RIV', awayCode: 'BOC' });

    expect(result.odds).toBe(0);
    expect(result.maxEV).toBe(0);
    expect(result.hasValue).toBe(false);
  });

  it('reutiliza la cuota previa si es del mismo pick y calcula el EV', () => {
    const result = buildPickSummary({
      probs,
      homeCode: 'RIV',
      awayCode: 'BOC',
      existing: { pick: 'HOME', odds: 2.1 },
    });

    expect(result.odds).toBe(2.1);
    expect(result.maxEV).toBeCloseTo(0.55 * 2.1 - 1, 3);
    expect(result.hasValue).toBe(true);
  });

  it('descarta la cuota previa si era de otro pick', () => {
    const result = buildPickSummary({
      probs,
      homeCode: 'RIV',
      awayCode: 'BOC',
      existing: { pick: 'AWAY', odds: 2.6 },
    });

    expect(result.odds).toBe(0);
    expect(result.hasValue).toBe(false);
  });

  it('hasValue es false si el EV no es positivo', () => {
    const result = buildPickSummary({
      probs,
      homeCode: 'RIV',
      awayCode: 'BOC',
      existing: { pick: 'HOME', odds: 1.5 },
    });

    expect(result.maxEV).toBeLessThan(0);
    expect(result.hasValue).toBe(false);
  });
});
