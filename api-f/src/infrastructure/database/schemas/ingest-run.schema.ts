import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Resultado de la ingesta de una liga dentro de una corrida.
@Schema({ _id: false })
class LeagueResult {
  @Prop({ required: true }) competition: string; // código en football-data.org, p. ej. PD
  @Prop() season?: number;
  @Prop({ default: 0 }) fixtures: number;
  @Prop({ default: 0 }) teams: number;
  @Prop({ default: 0 }) stats: number;
  @Prop() error?: string;
}
const LeagueResultSchema = SchemaFactory.createForClass(LeagueResult);

// Registro de cada corrida de ingesta (auditoría y diagnóstico).
@Schema({ collection: 'ingest_runs', timestamps: { createdAt: true, updatedAt: false } })
export class IngestRun {
  @Prop({ default: 'footballData' }) source: string;
  @Prop({ enum: ['cron', 'startup'], default: 'cron' }) trigger: string;
  @Prop({ enum: ['running', 'success', 'partial', 'failed'], default: 'running' })
  status: string;

  @Prop({ default: () => new Date() }) startedAt: Date;
  @Prop() finishedAt?: Date;

  // Peticiones gastadas en esta corrida y las que quedaban en el minuto (si la API lo informó).
  @Prop({ default: 0 }) requests: number;
  @Prop() requestsAvailableMinute?: number;

  @Prop({ type: [LeagueResultSchema], default: [] }) leagues: LeagueResult[];
  @Prop({ type: [String], default: [] }) errorMessages: string[];
}

export type IngestRunDocument = HydratedDocument<IngestRun>;
export const IngestRunSchema = SchemaFactory.createForClass(IngestRun);

IngestRunSchema.index({ source: 1, startedAt: -1 });
