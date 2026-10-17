import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'competitions', timestamps: true })
export class Competition {
  @Prop({ type: Object, default: {} })
  externalIds: Record<string, string | number>;

  @Prop({ required: true }) name: string;
  @Prop() country: string;
  @Prop({ required: true }) season: number;
  @Prop() currentRound: string;
  @Prop() logoUrl?: string;
    // Promedio de goles de la liga por partido, como local y como visitante.
  // Convierten las fuerzas relativas de cada equipo en goles esperados.
  @Prop({ default: 1.45 }) avgHomeGoals: number;
  @Prop({ default: 1.15 }) avgAwayGoals: number;
}

export type CompetitionDocument = HydratedDocument<Competition>;
export const CompetitionSchema = SchemaFactory.createForClass(Competition);

CompetitionSchema.index({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });
CompetitionSchema.index({ name: 1, season: 1 });