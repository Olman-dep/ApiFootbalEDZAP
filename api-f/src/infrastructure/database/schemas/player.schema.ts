// src/domain/schemas/player.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Player {
  @Prop({ type: Object, default: {} })
  externalIds: Record<string, number>;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['GK', 'DF', 'MF', 'FW'] })
  position: string;

  @Prop({ type: Types.ObjectId, ref: 'Team', index: true })
  currentTeamId: Types.ObjectId;

  @Prop({ default: false })
  injured: boolean;
}
export type PlayerDocument = HydratedDocument<Player>;
export const PlayerSchema = SchemaFactory.createForClass(Player);
PlayerSchema.index({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });