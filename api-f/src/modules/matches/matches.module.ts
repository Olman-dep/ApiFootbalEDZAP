import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';
import { MatchDataProviderFactory } from '../../infrastructure/data-source.provider.js';

@Module({
  controllers: [MatchesController],
  providers: [MatchesService, MatchDataProviderFactory],
  exports: [MatchesService],
})
export class MatchesModule {}

