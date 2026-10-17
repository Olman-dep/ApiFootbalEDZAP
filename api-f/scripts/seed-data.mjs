// Carga datos de ejemplo en MongoDB (competiciones, equipos y partidos).
//
// Uso (desde api-f/):   pnpm seed
//
// - Es idempotente: cada documento sembrado lleva externalIds.seed = "<clave>"
//   y se actualiza con upsert, así que puedes correrlo las veces que quieras.
// - Solo toca documentos con externalIds.seed; no borra ni modifica datos reales.
// - Las fechas son relativas a "ahora": volver a correrlo las refresca.
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

const COMPETITIONS = [
  {
    key: 'liga-argentina',
    name: 'Liga Profesional Argentina',
    country: 'Argentina',
    season: 2026,
    currentRound: 'Regular Season - 10',
  },
  {
    key: 'la-liga',
    name: 'La Liga',
    country: 'Spain',
    season: 2026,
    currentRound: 'Matchday 12',
  },
];

const TEAMS = [
  { key: 'river', name: 'River Plate', shortName: 'River', code: 'RIV', competition: 'liga-argentina' },
  { key: 'boca', name: 'Boca Juniors', shortName: 'Boca', code: 'BOC', competition: 'liga-argentina' },
  { key: 'racing', name: 'Racing Club', shortName: 'Racing', code: 'RAC', competition: 'liga-argentina' },
  { key: 'real-madrid', name: 'Real Madrid', shortName: 'Real Madrid', code: 'RMA', competition: 'la-liga' },
  { key: 'barcelona', name: 'Barcelona', shortName: 'Barcelona', code: 'BAR', competition: 'la-liga' },
  { key: 'atletico', name: 'Atlético Madrid', shortName: 'Atlético', code: 'ATM', competition: 'la-liga' },
];

// probs = [local, empate, visitante]. El pick es el resultado con mayor
// probabilidad; maxEV y hasValue se calculan con la cuota del pick.
const MATCHES = [
  { key: 'm1', competition: 'liga-argentina', round: 'Regular Season - 10', home: 'river', away: 'boca',
    day: 0, hour: 20, status: 'scheduled', score: null, probs: [0.50, 0.27, 0.23], pick: 'HOME', odds: 2.10 },
  { key: 'm2', competition: 'la-liga', round: 'Matchday 12', home: 'real-madrid', away: 'barcelona',
    day: 0, hour: 22, status: 'scheduled', score: null, probs: [0.42, 0.27, 0.31], pick: 'HOME', odds: 2.30 },
  { key: 'm3', competition: 'liga-argentina', round: 'Regular Season - 9', home: 'boca', away: 'racing',
    day: -1, hour: 19, status: 'finished', score: { home: 2, away: 1 }, probs: [0.45, 0.28, 0.27], pick: 'HOME', odds: 2.05 },
  { key: 'm4', competition: 'la-liga', round: 'Matchday 11', home: 'atletico', away: 'barcelona',
    day: -1, hour: 21, status: 'finished', score: { home: 1, away: 1 }, probs: [0.40, 0.30, 0.30], pick: 'HOME', odds: 2.60 },
  { key: 'm5', competition: 'liga-argentina', round: 'Regular Season - 11', home: 'racing', away: 'river',
    day: 1, hour: 20, status: 'scheduled', score: null, probs: [0.30, 0.28, 0.42], pick: 'AWAY', odds: 2.55 },
  { key: 'm6', competition: 'la-liga', round: 'Matchday 13', home: 'atletico', away: 'real-madrid',
    day: 2, hour: 21, status: 'scheduled', score: null, probs: [0.28, 0.27, 0.45], pick: 'AWAY', odds: 2.40 },
];

// ---------------------------------------------------------------------------
// Lógica (separada de la conexión para poder probarla sin una base real)
// ---------------------------------------------------------------------------

const round3 = (n) => Math.round(n * 1000) / 1000;

export function kickoffAt(now, dayOffset, hour) {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function buildPickSummary(match, home, away) {
  const [h, d, a] = match.probs;
  const prob = { HOME: h, DRAW: d, AWAY: a }[match.pick];
  const maxEV = round3(prob * match.odds - 1);
  return {
    pick: match.pick,
    pickCode: match.pick === 'HOME' ? home.code : match.pick === 'AWAY' ? away.code : 'X',
    odds: match.odds,
    homeWinProb: h,
    drawProb: d,
    awayWinProb: a,
    maxEV,
    hasValue: maxEV > 0,
  };
}

async function upsertByKey(collection, key, fields, now) {
  // El filtro por externalIds.seed ya crea ese campo al insertar; por eso no
  // se pone externalIds en $setOnInsert (generaría un conflicto de rutas).
  const filter = { 'externalIds.seed': key };
  await collection.updateOne(
    filter,
    { $set: { ...fields, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  const doc = await collection.findOne(filter);
  return doc._id;
}

export async function seed(db, now = new Date()) {
  const competitions = db.collection('competitions');
  const teams = db.collection('teams');
  const matches = db.collection('matches');

  const competitionIds = {};
  for (const c of COMPETITIONS) {
    const { key, ...fields } = c;
    competitionIds[key] = await upsertByKey(competitions, key, fields, now);
  }

  const teamDocs = {};
  for (const t of TEAMS) {
    const { key, competition, ...fields } = t;
    const _id = await upsertByKey(
      teams,
      key,
      { ...fields, competitionIds: [competitionIds[competition]] },
      now,
    );
    teamDocs[key] = { _id, name: t.name, code: t.code };
  }

  for (const m of MATCHES) {
    const home = teamDocs[m.home];
    const away = teamDocs[m.away];
    const competition = COMPETITIONS.find((c) => c.key === m.competition);

    await upsertByKey(
      matches,
      m.key,
      {
        competitionId: competitionIds[m.competition],
        competitionName: competition.name,
        season: competition.season,
        round: m.round,
        kickoff: kickoffAt(now, m.day, m.hour),
        status: m.status,
        homeTeamId: home._id,
        awayTeamId: away._id,
        homeTeam: { name: home.name, code: home.code },
        awayTeam: { name: away.name, code: away.code },
        score: m.score ?? { home: null, away: null },
        pickSummary: buildPickSummary(m, home, away),
      },
      now,
    );
  }

  return {
    competitions: COMPETITIONS.length,
    teams: TEAMS.length,
    matches: MATCHES.length,
  };
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

  // Misma conexión que usa la app (MongooseModule.forRoot(uri)): el nombre de
  // la base sale de la URI, así el seed y la API apuntan a la misma base.
  await mongoose.connect(uri);
  try {
    const db = mongoose.connection.db;
    const result = await seed(db);
    console.log(`Base: ${db.databaseName}`);
    console.log(
      `Seed OK -> ${result.competitions} competiciones, ${result.teams} equipos, ${result.matches} partidos`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Error en el seed:', error);
    process.exit(1);
  });
}