import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { IngestService } from './ingest.service.js';

const JOB_NAME = 'api-football-ingest';
// Cada 6 horas: 4 corridas/día x (2 peticiones por liga) cabe de sobra en las 100/día del plan gratis.
const DEFAULT_CRON = '0 */6 * * *';

@Injectable()
export class IngestScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(IngestScheduler.name);

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly ingest: IngestService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get<string>('INGEST_ENABLED') !== 'true') {
      this.logger.log('Ingesta automática desactivada (INGEST_ENABLED != true).');
      return;
    }

    const expression = this.config.get<string>('INGEST_CRON') ?? DEFAULT_CRON;
    const job = CronJob.from({
      cronTime: expression,
      onTick: () => this.run('cron'),
      start: true,
    });
    this.registry.addCronJob(JOB_NAME, job);
    this.logger.log(`Ingesta automática programada (${expression}).`);

    if (this.config.get<string>('INGEST_ON_START') === 'true') {
      this.run('startup');
    }
  }

  onModuleDestroy() {
    if (this.registry.doesExist('cron', JOB_NAME)) {
      this.registry.deleteCronJob(JOB_NAME);
    }
  }

  // No se espera: la ingesta no debe bloquear el arranque ni tumbar la app si falla.
  private run(trigger: 'cron' | 'startup') {
    this.ingest.runOnce(trigger).catch((error: unknown) => {
      this.logger.error(
        `Falló la ingesta (${trigger}): ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}
