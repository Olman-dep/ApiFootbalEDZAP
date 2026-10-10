// src/domain/schemas/player-season-stats.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PlayerSeasonStats {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, index: true })
  playerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true, index: true })
  teamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Competition' })
  competitionId: Types.ObjectId;

  @Prop({ required: true }) season: number;
  @Prop({ default: 0 }) appearances: number;
  @Prop({ default: 0 }) minutes: number;
  @Prop({ default: 0 }) shots: number;
  @Prop({ default: 0 }) shotsOnTarget: number;
}
export type PlayerSeasonStatsDocument = HydratedDocument<PlayerSeasonStats>;
export const PlayerSeasonStatsSchema = SchemaFactory.createForClass(PlayerSeasonStats);
PlayerSeasonStatsSchema.index({ playerId: 1, season: 1, competitionId: 1 }, { unique: true });