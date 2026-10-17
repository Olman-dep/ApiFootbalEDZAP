import { NotFoundException } from '@nestjs/common';
import { Types, isValidObjectId } from 'mongoose';
import type { Model } from 'mongoose';
import type { Match } from '../database/schemas/match.schema.js';
import type { Prediction } from '../database/schemas/prediction.schema.js';
import { buildPickSummary } from '../../ml/pick-summary.js';
import type {
  PredictionStore,
  PredictionToSave,
  SavedPrediction,
} from './prediction-store.interface.js';

type MatchLean = Match & { _id: Types.ObjectId };

const outcome = (prob: number) => ({ prob, fairOdds: prob > 0 ? 1 / prob : 0 });

export class MongoPredictionStore implements PredictionStore {
  constructor(
    private readonly predictionModel: Model<Prediction>,
    private readonly matchModel: Model<Match>,
  ) {}

  async saveLatest(input: PredictionToSave): Promise<SavedPrediction> {
    if (!isValidObjectId(input.matchId)) {
      throw new NotFoundException(`No se encontró el partido ${input.matchId}`);
    }
    const matchId = new Types.ObjectId(input.matchId);

    const match = await this.matchModel.findById(matchId).lean<MatchLean>();
    if (!match) {
      throw new NotFoundException(`No se encontró el partido ${input.matchId}`);
    }

    const { probabilities } = input;
    const generatedAt = new Date();

    // 1) Insertar la nueva versión como última.
    const created = await this.predictionModel.create({
      matchId,
      modelName: input.modelName,
      modelVersion: input.modelVersion,
      simulationsRun: 0,
      generatedAt,
      isLatest: true,
      lambdas: input.lambdas,
      result1x2: {
        home: outcome(probabilities.homeWin),
        draw: outcome(probabilities.draw),
        away: outcome(probabilities.awayWin),
      },
      totalGoals: input.totalGoals,
      tags: input.tags,
    });

    // 2) Las versiones anteriores pasan a historial. Se hace después de insertar
    //    para que nunca falte una "última" si algo falla a la mitad.
    await this.predictionModel.updateMany(
      { matchId, isLatest: true, _id: { $ne: created._id } },
      { $set: { isLatest: false } },
    );

    // 3) Resumen del pick en el partido.
    const summary = buildPickSummary({
      probs: probabilities,
      homeCode: match.homeTeam.code,
      awayCode: match.awayTeam.code,
      existing: match.pickSummary,
    });
    await this.matchModel.updateOne(
      { _id: matchId },
      { $set: { pickSummary: { ...summary, predictionId: created._id } } },
    );

    return {
      id: created._id.toString(),
      modelVersion: input.modelVersion,
      generatedAt: generatedAt.toISOString(),
    };
  }
}
