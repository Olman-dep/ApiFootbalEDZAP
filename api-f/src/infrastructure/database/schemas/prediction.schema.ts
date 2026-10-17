import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// Las predicciones son inmutables y versionadas: nunca se editan, cada corrida
// del motor crea un documento nuevo (y el anterior pasa a isLatest = false).

@Schema({ _id: false })
class Lambdas {
  @Prop() homeGoals: number;
  @Prop() awayGoals: number;
  @Prop() homeCorners?: number;
  @Prop() awayCorners?: number;
}

@Schema({ _id: false })
class OutcomeProb {
  @Prop({ required: true }) prob: number;
  @Prop({ required: true }) fairOdds: number; // 1 / prob
}
const OutcomeProbSchema = SchemaFactory.createForClass(OutcomeProb);

@Schema({ _id: false })
class Result1x2 {
  @Prop({ type: OutcomeProbSchema, required: true }) home: OutcomeProb;
  @Prop({ type: OutcomeProbSchema, required: true }) draw: OutcomeProb;
  @Prop({ type: OutcomeProbSchema, required: true }) away: OutcomeProb;
}

@Schema({ _id: false })
class Range {
  @Prop() min: number;
  @Prop() max: number;
}
const RangeSchema = SchemaFactory.createForClass(Range);

@Schema({ _id: false })
class TotalGoals {
  @Prop() line: number;
  @Prop({ enum: ['over', 'under'] }) selection: string;
  @Prop() prob: number;
  @Prop() confidence: number;
  @Prop() projectedTotal: number;
  @Prop({ type: RangeSchema }) range: Range;
}

@Schema({ _id: false })
class DistributionBin {
  @Prop() value: number;
  @Prop() prob: number;
}
const DistributionBinSchema = SchemaFactory.createForClass(DistributionBin);

@Schema({ _id: false })
class Corners {
  @Prop() projectedTotal: number;
  @Prop({ type: RangeSchema }) range: Range;
  @Prop({ type: [DistributionBinSchema], default: [] }) distribution: DistributionBin[];
}

@Schema({ _id: false })
class MarketPick {
  @Prop({ required: true }) market: string; // corners, goals, shots...
  @Prop({ required: true }) selection: string; // over_8.5
  @Prop() prob: number;
  @Prop() confidence: number;
  @Prop() bestOdds?: number;
  @Prop() bookmaker?: string;
  @Prop() impliedProb?: number;
  @Prop() expectedValue?: number;
  @Prop({ default: false }) isValueBet: boolean;
}
const MarketPickSchema = SchemaFactory.createForClass(MarketPick);

@Schema({ _id: false })
class PlayerProp {
  @Prop({ type: Types.ObjectId, ref: 'Player' }) playerId?: Types.ObjectId;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) market: string; // shots | shots_on_target
  @Prop() line: number;
  @Prop() label: string; // "2+ shots"
  @Prop({ required: true }) prob: number;
}
const PlayerPropSchema = SchemaFactory.createForClass(PlayerProp);

@Schema({ collection: 'predictions', timestamps: { createdAt: true, updatedAt: false } })
export class Prediction {
  @Prop({ type: Types.ObjectId, ref: 'Match', required: true }) matchId: Types.ObjectId;

  @Prop({ default: 'poisson_monte_carlo' }) modelName: string;
  @Prop({ required: true }) modelVersion: string;
  @Prop({ default: 0 }) simulationsRun: number;
  @Prop({ default: () => new Date() }) generatedAt: Date;
  @Prop({ default: true }) isLatest: boolean;

  @Prop({ type: SchemaFactory.createForClass(Lambdas) }) lambdas: Lambdas;
  @Prop({ type: SchemaFactory.createForClass(Result1x2), required: true }) result1x2: Result1x2;
  @Prop({ type: SchemaFactory.createForClass(TotalGoals) }) totalGoals?: TotalGoals;
  @Prop({ type: SchemaFactory.createForClass(Corners) }) corners?: Corners;

  @Prop({ type: [MarketPickSchema], default: [] }) markets: MarketPick[];
  @Prop({ type: [PlayerPropSchema], default: [] }) playerProps: PlayerProp[];
  @Prop({ type: [String], default: [] }) tags: string[];
}

export type PredictionDocument = HydratedDocument<Prediction>;
export const PredictionSchema = SchemaFactory.createForClass(Prediction);

PredictionSchema.index({ matchId: 1, isLatest: 1 });
PredictionSchema.index({ matchId: 1, generatedAt: -1 }); // historial
PredictionSchema.index({ 'markets.isValueBet': 1, generatedAt: -1 }); // GET /predictions/value