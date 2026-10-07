import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { MatchesService } from './matches.service.js';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('today')
  async getTodayMatches() {
    return this.matchesService.getTodayMatches();
  }

  @Get('upcoming')
  async getUpcomingMatches() {
    return this.matchesService.getUpcomingMatches();
  }

  @Get()
  async getMatches(@Query() query: any) {
    try {
      return await this.matchesService.getMatches(query);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw e;
    }
  }

  @Get(':matchId')
  async getMatchById(@Param('matchId') matchId: string) {
    try {
      return await this.matchesService.getMatchById(matchId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      throw e;
    }
  }
}