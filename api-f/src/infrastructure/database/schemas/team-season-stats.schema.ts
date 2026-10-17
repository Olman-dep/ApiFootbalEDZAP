import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// Totales de la temporada como local o como visitante.
@Schema({ _id: false })
class VenueStats {
  @Prop({ default: 0 }) played: number;
  @Prop({ default: 0 }) goalsFor: number;
  @Prop({ default: 0 }) goalsAgainst: number;
  @Prop({ default: 0 }) corners: number;
  @Prop({ default: 0 }) shots: number;
  @Prop({ default: 0 }) cards: number;
}
const VenueStatsSchema = SchemaFactory.createForClass(VenueStats);

// Fuerza relativa respecto al promedio de la liga (1.0 = promedio).
// Son los insumos del cálculo de lambda del modelo Poisson.
@Schema({ _id: false })
class Strength {
  @Prop({ default: 1 }) attack: number;
  @Prop({ default: 1 }) defense: number;
}
const StrengthSchema = SchemaFactory.createForClass(Strength);

@Schema({ collection: 'team_season_stats', timestamps: true })
export class TeamSeasonStats {
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true }) teamId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Competition', required: true }) competitionId: Types.ObjectId;
  @Prop({ required: true }) season: number;

  @Prop() rank?: number;
  @Prop({ type: [String], enum: ['W', 'D', 'L'], default: [] }) form: string[];

  @Prop({ type: VenueStatsSchema, default: () => ({}) }) home: VenueStats;
  @Prop({ type: VenueStatsSchema, default: () => ({}) }) away: VenueStats;
  @Prop({ type: StrengthSchema, default: () => ({}) }) strength: Strength;
}

export type TeamSeasonStatsDocument = HydratedDocument<TeamSeasonStats>;
export const TeamSeasonStatsSchema = SchemaFactory.createForClass(TeamSeasonStats);

TeamSeasonStatsSchema.index({ teamId: 1, competitionId: 1, season: 1 }, { unique: true });