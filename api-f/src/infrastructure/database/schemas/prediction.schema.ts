import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PredictionDocument = HydratedDocument<Prediction>;

@Schema()
export class Prediction {
  @Prop({ required: true })
  matchId: string;

  @Prop({ required: true })
  predictedWinner: string;
}

export const PredictionSchema = SchemaFactory.createForClass(Prediction);