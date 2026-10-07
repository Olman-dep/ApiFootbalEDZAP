import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';
import { MockProvider } from '../../infrastructure/mock/mock-data.js';

describe('MatchesController', () => {
  let controller: MatchesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        MatchesService,
        {
          provide: 'MATCH_DATA_PROVIDER',
          useClass: MockProvider,
        },
      ],
    }).compile();

    controller = app.get<MatchesController>(MatchesController);
  });

  describe('getMatches', () => {
    it('returns matches with default filter all', async () => {
      const result = await controller.getMatches({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('passes query params through', async () => {
      const result = await controller.getMatches({ competitionId: 'la-liga' });
      expect(result.every((m) => m.competitionId === 'la-liga')).toBe(true);
    });

    it('throws BadRequestException for invalid month', async () => {
      await expect(controller.getMatches({ month: 'bad' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getUpcomingMatches', () => {
    it('returns upcoming matches', async () => {
      const result = await controller.getUpcomingMatches();
      const now = Date.now();
      expect(result.every((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now)).toBe(true);
    });
  });

  describe('getMatchById', () => {
    it('returns match when found', async () => {
      const provider = new MockProvider();
      const matches = await provider.getMatches();
      const result = await controller.getMatchById(matches[0].id);
      expect(result.id).toBe(matches[0].id);
    });

    it('throws NotFoundException when missing', async () => {
      await expect(controller.getMatchById('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
