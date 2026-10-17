import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class TeamColors {
  @Prop() primary?: string;
  @Prop() secondary?: string;
}
const TeamColorsSchema = SchemaFactory.createForClass(TeamColors);

@Schema({ collection: 'teams', timestamps: true })
export class Team {
  @Prop({ type: Object, default: {} })
  externalIds: Record<string, string | number>;

  @Prop({ required: true }) name: string;
  @Prop() shortName: string;
  @Prop({ required: true }) code: string; // ARS, CHE, RIV...
  @Prop() crestUrl?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Competition' }], default: [] })
  competitionIds: Types.ObjectId[];

  @Prop({ type: TeamColorsSchema }) colors?: TeamColors;
}

export type TeamDocument = HydratedDocument<Team>;
export const TeamSchema = SchemaFactory.createForClass(Team);

TeamSchema.index({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });
TeamSchema.index({ 'externalIds.footballData': 1 }, { unique: true, sparse: true });
TeamSchema.index({ code: 1 });