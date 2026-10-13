import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlayersService } from '../services/players.service';

@ApiTags('players')
@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get(':playerId')
  findOne(@Param('playerId') playerId: string) {
    return this.players.findById(playerId);
  }

  @Get(':playerId/props')
  props(
    @Param('playerId') playerId: string,
    @Query('matchId') matchId?: string,
  ) {
    return this.players.getProps(playerId, matchId);
  }
}