
import { describe, expect, it } from 'vitest';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database.module.js';

describe('DatabaseModule', () => {
  it('no configura Mongoose cuando la URI no existe', () => {
    const result = DatabaseModule.forRoot(undefined);

    expect(result.module).toBe(DatabaseModule);
    expect(result.imports ?? []).toHaveLength(0);
  });

  it('configura Mongoose cuando recibe una URI', () => {
    const result = DatabaseModule.forRoot(
      'mongodb://localhost:27017/sports_predictions',
    );

    expect(result.imports).toHaveLength(1);
    expect(
      (result.imports?.[0] as { module: unknown }).module,
    ).toBe(MongooseModule);
  });
});
