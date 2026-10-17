import { SchedulerRegistry } from '@nestjs/schedule';
import { IngestScheduler } from './ingest.scheduler.js';
import { IngestModule, parseLeagues } from './ingest.module.js';

function setup(env: Record<string, string | undefined>) {
  const runOnce = vi.fn(async () => null);
  const registry = new SchedulerRegistry();
  const config = { get: (key: string) => env[key] };
  const scheduler = new IngestScheduler(config as any, registry, { runOnce } as any);
  return { scheduler, registry, runOnce };
}

describe('IngestScheduler', () => {
  it('no programa nada si INGEST_ENABLED no es "true"', () => {
    const { scheduler, registry, runOnce } = setup({});

    scheduler.onApplicationBootstrap();

    expect(registry.doesExist('cron', 'football-data-ingest')).toBe(false);
    expect(runOnce).not.toHaveBeenCalled();
  });

  it('programa el cron cuando está habilitado y lo elimina al cerrar', () => {
    const { scheduler, registry, runOnce } = setup({
      INGEST_ENABLED: 'true',
      INGEST_CRON: '0 0 1 1 *', // una vez al año: no dispara durante el test
    });

    scheduler.onApplicationBootstrap();
    expect(registry.doesExist('cron', 'football-data-ingest')).toBe(true);
    expect(runOnce).not.toHaveBeenCalled();

    scheduler.onModuleDestroy();
    expect(registry.doesExist('cron', 'football-data-ingest')).toBe(false);
  });

  it('con INGEST_ON_START=true corre una vez al arrancar', () => {
    const { scheduler, runOnce } = setup({
      INGEST_ENABLED: 'true',
      INGEST_CRON: '0 0 1 1 *',
      INGEST_ON_START: 'true',
    });

    scheduler.onApplicationBootstrap();
    scheduler.onModuleDestroy();

    expect(runOnce).toHaveBeenCalledWith('startup');
  });

  it('una expresión cron inválida falla con un error claro al arrancar', () => {
    const { scheduler } = setup({ INGEST_ENABLED: 'true', INGEST_CRON: 'esto no es cron' });

    expect(() => scheduler.onApplicationBootstrap()).toThrow();
  });
});

describe('IngestModule', () => {
  it('sin MONGODB_URI el módulo queda vacío (la app sigue con datos mock)', () => {
    const dynamic = IngestModule.forRoot(undefined);

    expect(dynamic.providers).toBeUndefined();
    expect(dynamic.imports).toBeUndefined();
  });

  it('con MONGODB_URI registra el servicio y el scheduler', () => {
    const dynamic = IngestModule.forRoot('mongodb://localhost:27017/test');

    expect(dynamic.providers).toContain(IngestScheduler);
    expect(dynamic.imports?.length).toBeGreaterThan(0);
  });
});

describe('parseLeagues', () => {
  it('por defecto usa Argentina (128) y La Liga (140)', () => {
    expect(parseLeagues(undefined)).toEqual([128, 140]);
  });

  it('lee una lista separada por comas e ignora valores inválidos', () => {
    expect(parseLeagues('39, 140,abc,-1, 61')).toEqual([39, 140, 61]);
  });
});
