import type { MatchProbabilities } from '../../ml/poisson.service.js';

export interface PredictionToSave {
  matchId: string;
  modelName: string;
  modelVersion: string;
  lambdas: { homeGoals: number; awayGoals: number };
  // Probabilidades 1X2 del modelo; el store calcula las cuotas justas (1 / prob).
  probabilities: MatchProbabilities;
  totalGoals: {
    line: number;
    selection: 'over' | 'under';
    prob: number;
    projectedTotal: number;
  };
  tags: string[];
}

export interface SavedPrediction {
  id: string;
  modelVersion: string;
  generatedAt: string;
}

export interface PredictionStore {
  /**
   * Guarda una predicción nueva como la última del partido (las anteriores
   * quedan como historial con isLatest = false) y actualiza el pickSummary
   * del partido.
   */
  saveLatest(prediction: PredictionToSave): Promise<SavedPrediction>;
}
