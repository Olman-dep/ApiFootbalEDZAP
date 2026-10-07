import { MockProvider } from '../../infrastructure/mock/mock-data.js';
import { MatchesService } from './matches.service.js';

function createService() {
  const provider = new MockProvider();
  return new MatchesService(provider as any);
}

describe('MatchesService', () => {
  let service: MatchesService;

  beforeEach(() => {
    service = createService();
  });

  describe('getTodayMatches', () => {
    it('returns today matches as before', async () => {
      const result = await service.getTodayMatches();
      expect(result.every((m) => new Date(m.kickoff).toDateString() === new Date().toDateString())).toBe(true);
    });
  });

  describe('getMatches', () => {
    it('returns all matches with no filters', async () => {
      const result = await service.getMatches({});
      const all = await new MockProvider().getMatches();
      expect(result.length).toBe(all.length);
      expect(result.every((m) => all.some((a) => a.id === m.id))).toBe(true);
    });

    it('filters by competitionId', async () => {
      const result = await service.getMatches({ competitionId: 'liga-argentina' });
      expect(result.length > 0).toBe(true);
      expect(result.every((m) => m.competitionId === 'liga-argentina')).toBe(true);
    });

    it('filters by month YYYY-MM', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      const result = await service.getMatches({ month: monthStr });
      expect(result.length > 0).toBe(true);
      result.forEach((m) => {
        const d = new Date(m.kickoff);
        expect(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`).toBe(monthStr);
      });
    });

    it('throws BadRequestException for invalid month format', async () => {
      await expect(service.getMatches({ month: '2026-13' } as any)).rejects.toThrow();
      await expect(service.getMatches({ month: '202613' } as any)).rejects.toThrow();
      await expect(service.getMatches({ month: 'abc' } as any)).rejects.toThrow();
    });

    it('filters by high_edge (pickSummary.hasValue true)', async () => {
      const result = await service.getMatches({ filter: 'high_edge' });
      expect(result.length > 0).toBe(true);
      expect(result.every((m) => m.pickSummary.hasValue === true)).toBe(true);
    });

    it('filters by upcoming (scheduled and future)', async () => {
      const result = await service.getMatches({ filter: 'upcoming' });
      const now = Date.now();
      expect(result.length > 0).toBe(true);
      expect(result.every((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now)).toBe(true);
    });

    it('throws BadRequestException for unknown filter', async () => {
      await expect(service.getMatches({ filter: 'invalid' as any })).rejects.toThrow();
    });

    it('combines filters (competitionId + month)', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      const result = await service.getMatches({ competitionId: 'liga-argentina', month: monthStr });
      expect(result.length > 0).toBe(true);
      result.forEach((m) => {
        expect(m.competitionId).toBe('liga-argentina');
        const d = new Date(m.kickoff);
        expect(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`).toBe(monthStr);
      });
    });

    it('combines filters (all three)', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      const result = await service.getMatches({ competitionId: 'liga-argentina', month: monthStr, filter: 'all' });
      expect(result.length > 0).toBe(true);
      result.forEach((m) => {
        expect(m.competitionId).toBe('liga-argentina');
        const d = new Date(m.kickoff);
        expect(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`).toBe(monthStr);
      });
    });
  });

  describe('getUpcomingMatches', () => {
    it('returns scheduled and future matches sorted by kickoff', async () => {
      const result = await service.getUpcomingMatches();
      const now = Date.now();
      expect(result.every((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now)).toBe(true);
      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i].kickoff).getTime() >= new Date(result[i - 1].kickoff).getTime()).toBe(true);
      }
    });
  });

  describe('getMatchById', () => {
    it('returns match when found', async () => {
      const all = await new MockProvider().getMatches();
      const match = all[0];
      const result = await service.getMatchById(match.id);
      expect(result).toEqual(match);
    });

    it('throws NotFoundException when missing', async () => {
      await expect(service.getMatchById('non-existent-id')).rejects.toThrow();
    });
  });
});
