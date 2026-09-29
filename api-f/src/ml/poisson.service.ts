import { Injectable } from '@nestjs/common';

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function poissonProbability(observedGoals: number, averageGoals: number): number {
  return (
    (Math.pow(averageGoals, observedGoals) * Math.exp(-averageGoals)) /
    factorial(observedGoals)
  );
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
}

const MAX_GOALS = 6;

@Injectable()
export class PoissonService {
  calculateMatchProbabilities(homeAvgGoals: number, awayAvgGoals: number): MatchProbabilities {
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;

    for (let homeGoals = 0; homeGoals <= MAX_GOALS; homeGoals++) {
      for (let awayGoals = 0; awayGoals <= MAX_GOALS; awayGoals++) {
        const probability =
          poissonProbability(homeGoals, homeAvgGoals) *
          poissonProbability(awayGoals, awayAvgGoals);

        if (homeGoals > awayGoals) homeWin += probability;
        else if (homeGoals === awayGoals) draw += probability;
        else awayWin += probability;
      }
    }

    return { homeWin, draw, awayWin };
  }
}