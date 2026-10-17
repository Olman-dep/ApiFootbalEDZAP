import type {
  PredictionStore,
  PredictionToSave,
  SavedPrediction,
} from '../providers/prediction-store.interface.js';

// Store para DATA_SOURCE=mock: guarda en memoria, así el flujo funciona sin Mongo.
export class InMemoryPredictionStore implements PredictionStore {
  private readonly saved: (PredictionToSave & SavedPrediction & { isLatest: boolean })[] = [];

  async saveLatest(prediction: PredictionToSave): Promise<SavedPrediction> {
    for (const item of this.saved) {
      if (item.matchId === prediction.matchId) item.isLatest = false;
    }

    const result: SavedPrediction = {
      id: `mock-prediction-${this.saved.length + 1}`,
      modelVersion: prediction.modelVersion,
      generatedAt: new Date().toISOString(),
    };
    this.saved.push({ ...prediction, ...result, isLatest: true });

    return result;
  }
}
