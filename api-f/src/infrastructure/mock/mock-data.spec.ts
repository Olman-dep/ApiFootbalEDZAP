import { MockProvider } from './mock-data.js';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('should have 6 matches across 2 competitions', async () => {
    const matches = await provider.getMatches();
    expect(matches).toHaveLength(6);
    const competitions = new Set(matches.map((m) => m.competition));
    expect(competitions.size).toBe(2);
    expect(competitions.has('Liga Profesional Argentina')).toBe(true);
    expect(competitions.has('La Liga')).toBe(true);
  });

  it('should keep existing matches with ids 1 and 2 present', async () => {
    const matches = await provider.getMatches();
    const match1 = matches.find((m) => m.id === '1');
    const match2 = matches.find((m) => m.id === '2');
    expect(match1).toBeDefined();
    expect(match2).toBeDefined();
    expect(match1?.homeTeam).toBe('River Plate');
    expect(match1?.awayTeam).toBe('Boca Juniors');
    expect(match1?.competition).toBe('Liga Profesional Argentina');
    expect(match2?.homeTeam).toBe('Real Madrid');
    expect(match2?.awayTeam).toBe('Barcelona');
    expect(match2?.competition).toBe('La Liga');
  });

  it('should have pickSummary.hasValue present for all matches', async () => {
    const matches = await provider.getMatches();
    for (const match of matches) {
      expect(match.pickSummary).toBeDefined();
      expect(match.pickSummary.hasValue).toBeDefined();
    }
  });

  it('should return matches with kickoff today for getTodayMatches', async () => {
    const todayMatches = await provider.getTodayMatches();
    expect(todayMatches.length).toBeGreaterThan(0);
    const today = new Date().toDateString();
    for (const match of todayMatches) {
      expect(new Date(match.kickoff).toDateString()).toBe(today);
    }
  });

  it('should return only scheduled future matches sorted by kickoff ascending for getUpcomingMatches', async () => {
    const upcoming = await provider.getUpcomingMatches();
    for (let i = 0; i < upcoming.length - 1; i++) {
      const currentKickoff = new Date(upcoming[i].kickoff).getTime();
      const nextKickoff = new Date(upcoming[i + 1].kickoff).getTime();
      expect(currentKickoff).toBeLessThanOrEqual(nextKickoff);
      expect(upcoming[i].status).toBe('scheduled');
    }
    for (const match of upcoming) {
      expect(match.status).toBe('scheduled');
      expect(new Date(match.kickoff).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('should return match by id for getMatchById', async () => {
    const match = await provider.getMatchById('1');
    expect(match).toBeDefined();
    expect(match?.id).toBe('1');
  });

  it('should return null for non-existent match id', async () => {
    const match = await provider.getMatchById('non-existent');
    expect(match).toBeNull();
  });
});
