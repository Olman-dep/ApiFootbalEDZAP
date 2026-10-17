import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongoPredictionStore } from './mongo-prediction.store.js';
import type { PredictionToSave } from './prediction-store.interface.js';

function setup(matchDoc: unknown) {
  const createdId = new Types.ObjectId();
  const calls: { op: string; args: any[] }[] = [];

  const predictionModel = {
    create: vi.fn(async (doc: any) => {
      calls.push({ op: 'create', args: [doc] });
      return { ...doc, _id: createdId };
    }),
    updateMany: vi.fn(async (...args: any[]) => {
      calls.push({ op: 'updateMany', args });
    }),
  } as any;
  const matchModel = {
    findById: () => ({ lean: async () => matchDoc }),
    updateOne: vi.fn(async (...args: any[]) => {
      calls.push({ op: 'updateOne', args });
    }),
  } as any;

  return {
    store: new MongoPredictionStore(predictionModel, matchModel),
    predictionModel,
    matchModel,
    createdId,
    calls,
  };
}

const matchId = new Types.ObjectId();
const matchDoc = {
  _id: matchId,
  homeTeam: { name: 'River Plate', code: 'RIV' },
  awayTeam: { name: 'Boca Juniors', code: 'BOC' },
  pickSummary: { pick: 'HOME', odds: 2.1, hasValue: false },
};

const input: PredictionToSave = {
  matchId: matchId.toString(),
  modelName: 'poisson',
  modelVersion: '1.0.0',
  lambdas: { homeGoals: 1.44, awayGoals: 0.66 },
  probabilities: { homeWin: 0.55, draw: 0.25, awayWin: 0.2 },
  totalGoals: { line: 2.5, selection: 'under', prob: 0.6, projectedTotal: 2.1 },
  tags: ['team_stats'],
};

describe('MongoPredictionStore', () => {
  it('inserta la nueva versión, archiva las anteriores y actualiza el pickSummary, en ese orden', async () => {
    const { store, calls, createdId } = setup(matchDoc);

    const saved = await store.saveLatest(input);

    expect(calls.map((c) => c.op)).toEqual(['create', 'updateMany', 'updateOne']);
    expect(saved.id).toBe(createdId.toString());
    expect(saved.modelVersion).toBe('1.0.0');

    const created = calls[0].args[0];
    expect(created.isLatest).toBe(true);
    expect(created.matchId.equals(matchId)).toBe(true);
    expect(created.lambdas).toEqual({ homeGoals: 1.44, awayGoals: 0.66 });
    expect(created.result1x2.home.prob).toBe(0.55);
    expect(created.result1x2.home.fairOdds).toBeCloseTo(1 / 0.55, 10);
    expect(created.tags).toEqual(['team_stats']);

    const [filter, update] = calls[1].args;
    expect(filter.isLatest).toBe(true);
    expect(filter._id.$ne.equals(createdId)).toBe(true);
    expect(update).toEqual({ $set: { isLatest: false } });
  });

  it('actualiza matches.pickSummary con el pick, el predictionId y el EV con la cuota previa', async () => {
    const { store, calls, createdId } = setup(matchDoc);

    await store.saveLatest(input);

    const [filter, update] = calls[2].args;
    expect(filter._id.equals(matchId)).toBe(true);
    const summary = update.$set.pickSummary;
    expect(summary.pick).toBe('HOME');
    expect(summary.pickCode).toBe('RIV');
    expect(summary.predictionId.equals(createdId)).toBe(true);
    expect(summary.odds).toBe(2.1);
    expect(summary.maxEV).toBeCloseTo(0.55 * 2.1 - 1, 3);
    expect(summary.hasValue).toBe(true);
  });

  it('lanza NotFoundException si el partido no existe y no escribe nada', async () => {
    const { store, predictionModel, matchModel } = setup(null);

    await expect(store.saveLatest(input)).rejects.toThrow(NotFoundException);
    expect(predictionModel.create).not.toHaveBeenCalled();
    expect(matchModel.updateOne).not.toHaveBeenCalled();
  });

  it('lanza NotFoundException si el matchId no es un ObjectId válido', async () => {
    const { store, predictionModel } = setup(matchDoc);

    await expect(store.saveLatest({ ...input, matchId: '1' })).rejects.toThrow(
      NotFoundException,
    );
    expect(predictionModel.create).not.toHaveBeenCalled();
  });
});
