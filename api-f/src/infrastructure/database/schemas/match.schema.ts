import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class TeamRef {
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) code: string;
}
const TeamRefSchema = SchemaFactory.createForClass(TeamRef);

@Schema({ _id: false })
class Score {
  @Prop({ type: Number, default: null }) home: number | null;
  @Prop({ type: Number, default: null }) away: number | null;
}
const ScoreSchema = SchemaFactory.createForClass(Score);

@Schema({ _id: false })
class PickSummary {
  @Prop({ type: Types.ObjectId, ref: 'Prediction' }) predictionId: Types.ObjectId;
  @Prop({ enum: ['HOME', 'DRAW', 'AWAY'] }) pick: string;
  @Prop() pickCode: string;
  @Prop() odds: number;
  @Prop() homeWinProb: number;
  @Prop() drawProb: number;
  @Prop() awayWinProb: number;
  @Prop() maxEV: number;
  @Prop({ default: false }) hasValue: boolean;
}
const PickSummarySchema = SchemaFactory.createForClass(PickSummary);

@Schema({ collection: 'matches', timestamps: true })
export class Match {
  @Prop({ type: Object, default: {} }) externalIds: Record<string, number>;
  @Prop({ type: Types.ObjectId, ref: 'Competition', required: true }) competitionId: Types.ObjectId;
  @Prop({ required: true }) season: number;
  @Prop() round: string;
  @Prop({ required: true }) kickoff: Date;
  @Prop({ enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'], default: 'scheduled' })
  status: string;
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true }) homeTeamId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true }) awayTeamId: Types.ObjectId;
  @Prop({ type: TeamRefSchema, required: true }) homeTeam: TeamRef; // desnormalizado
  @Prop({ type: TeamRefSchema, required: true }) awayTeam: TeamRef; // desnormalizado
  @Prop({ type: ScoreSchema, default: () => ({}) }) score: Score;
  @Prop({ type: PickSummarySchema }) pickSummary?: PickSummary;
}
export type MatchDocument = HydratedDocument<Match>;
export const MatchSchema = SchemaFactory.createForClass(Match);

MatchSchema.index({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });
MatchSchema.index({ competitionId: 1, kickoff: 1 });            // Monthly Matches
MatchSchema.index({ status: 1, kickoff: 1 });                   // Upcoming / today
MatchSchema.index({ 'pickSummary.hasValue': 1, kickoff: 1 });   // High edge