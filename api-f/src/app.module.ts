import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MatchesModule } from './modules/matches/matches.module.js';

@Module({
  imports: [MatchesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}