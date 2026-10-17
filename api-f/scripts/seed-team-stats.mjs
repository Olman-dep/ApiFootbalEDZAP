// Siembra team_season_stats (estadísticas de temporada por equipo) y calcula
// la fuerza de ataque/defensa de cada uno. Requiere haber corrido antes el
// seed principal (competiciones y equipos).
//
// Uso (desde api-f/):   pnpm seed:stats      (o pnpm seed, que corre ambos)
//
// Idempotente: usa upsert por (teamId, competitionId, season).
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Datos de ejemplo: totales de la temporada, separados local / visitante.
// ---------------------------------------------------------------------------

const venue = (played, goalsFor, goalsAgainst, corners, shots, cards) => ({
  played, goalsFor, goalsAgainst, corners, shots, cards,
});

const STATS = [
  // --- Liga Profesional Argentina ---
  { team: 'river', competition: 'liga-argentina', rank: 1, form: ['W', 'W', 'D', 'W', 'W'],
    home: venue(5, 8, 3, 30, 70, 12), away: venue(5, 6, 5, 24, 58, 14) },
  { team: 'boca', competition: 'liga-argentina', rank: 2, form: ['W', 'D', 'W', 'L', 'W'],
    home: venue(5, 7, 4, 27, 64, 13), away: venue(5, 4, 6, 21, 52, 16) },
  { team: 'racing', competition: 'liga-argentina', rank: 4, form: ['D', 'L', 'W', 'D', 'L'],
    home: venue(5, 6, 5, 25, 60, 15), away: venue(5, 5, 7, 20, 49, 17) },

  // --- La Liga ---
  { team: 'real-madrid', competition: 'la-liga', rank: 1, form: ['W', 'W', 'W', 'D', 'W'],
    home: venue(5, 12, 3, 33, 82, 8), away: venue(5, 9, 5, 28, 70, 10) },
  { team: 'barcelona', competition: 'la-liga', rank: 2, form: ['W', 'L', 'W', 'W', 'D'],
    home: venue(5, 11, 4, 31, 79, 9), away: venue(5, 8, 6, 26, 66, 11) },
  { team: 'atletico', competition: 'la-liga', rank: 3, form: ['D', 'W', 'D', 'W', 'L'],
    home: venue(5, 8, 3, 26, 62, 14), away: venue(5, 5, 5, 21, 50, 16) },
];

// Promedio de goles por partido de la LIGA COMPLETA (no solo de los equipos
// sembrados aquí, que son de los mejores). Con datos reales de una API este
// promedio se calcularía con todos los equipos de la competición.
const LEAGUE_AVERAGES = {
  'liga-argentina': { avgHomeGoals: 1.3, avgAwayGoals: 0.95 },
  'la-liga': { avgHomeGoals: 1.5, avgAwayGoals: 1.15 },
};

// ---------------------------------------------------------------------------
// Lógica
// ---------------------------------------------------------------------------

const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Fuerza relativa de cada equipo respecto al promedio de su liga (1.0 = promedio).
 *   attack  = goles a favor por partido / promedio de goles por equipo y partido
 *   defense = goles en contra por partido / promedio de goles por equipo y partido
 *             (defense > 1 significa que concede MÁS que el promedio: es una
 *              "debilidad defensiva", así se multiplica directo en el lambda)
 *
 * Goles esperados de un partido (lo usará PredictionsService):
 *   lambdaLocal     = ataque(local)     * defensa(visitante) * avgHomeGoals
 *   lambdaVisitante = ataque(visitante) * defensa(local)     * avgAwayGoals
 */
export function computeStrengths(rows, { avgHomeGoals, avgAwayGoals }) {
  const perTeamGame = (avgHomeGoals + avgAwayGoals) / 2;

  const strengths = new Map();
  for (const r of rows) {
    const played = r.home.played + r.away.played;
    const goalsFor = r.home.goalsFor + r.away.goalsFor;
    const goalsAgainst = r.home.goalsAgainst + r.away.goalsAgainst;
    strengths.set(r.team, {
      attack: round3(goalsFor / played / perTeamGame),
      defense: round3(goalsAgainst / played / perTeamGame),
    });
  }
  return strengths;
}

export async function seedTeamStats(db, now = new Date()) {
  const competitions = db.collection('competitions');
  const teams = db.collection('teams');
  const statsCol = db.collection('team_season_stats');

  const competitionKeys = [...new Set(STATS.map((s) => s.competition))];
  let upserted = 0;

  for (const compKey of competitionKeys) {
    const competition = await competitions.findOne({ 'externalIds.seed': compKey });
    if (!competition) {
      throw new Error(
        `No existe la competición "${compKey}". Corre primero el seed principal (pnpm seed).`,
      );
    }

    const rows = STATS.filter((s) => s.competition === compKey);
    const { avgHomeGoals, avgAwayGoals } = LEAGUE_AVERAGES[compKey];
    const strengths = computeStrengths(rows, { avgHomeGoals, avgAwayGoals });

    // Los promedios de la liga convierten las fuerzas relativas en goles esperados.
    await competitions.updateOne(
      { _id: competition._id },
      { $set: { avgHomeGoals, avgAwayGoals, updatedAt: now } },
    );

    for (const r of rows) {
      const team = await teams.findOne({ 'externalIds.seed': r.team });
      if (!team) {
        throw new Error(`No existe el equipo "${r.team}". Corre primero el seed principal (pnpm seed).`);
      }

      await statsCol.updateOne(
        { teamId: team._id, competitionId: competition._id, season: competition.season },
        {
          $set: {
            rank: r.rank,
            form: r.form,
            home: r.home,
            away: r.away,
            strength: strengths.get(r.team),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      upserted++;
    }
  }

  return { teamSeasonStats: upserted };
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI. Defínela en api-f/.env (incluye el nombre de la base en la URI).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const db = mongoose.connection.db;
    const result = await seedTeamStats(db);
    console.log(`Base: ${db.databaseName}`);
    console.log(`Seed stats OK -> ${result.teamSeasonStats} documentos en team_season_stats`);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Error en el seed de estadísticas:', error);
    process.exit(1);
  });
}