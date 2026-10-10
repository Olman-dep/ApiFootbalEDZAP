# ⚽ Backend — Plataforma de Pronósticos Deportivos con IA (OddsMatrix)

Backend en **NestJS (TypeScript) + MongoDB** (motor Poisson / Monte Carlo) para una plataforma de analítica y pronósticos deportivos, con ingesta de datos vía **scraping** y/o **API de fútbol**. Gestionado con **pnpm**.

⚠️ Los pronósticos son estimaciones probabilísticas, no garantías de resultado.

## 1. Resumen

Este backend expone una API REST para:

- Consultar partidos, equipos y jugadores.
- Generar pronósticos probabilísticos (goles, córners, tiros, tarjetas, player props) usando un motor Poisson + Monte Carlo.
- Comparar las probabilidades del modelo contra cuotas de mercado y calcular Expected Value (EV).
- Gestionar usuarios, autenticación (JWT) y planes Free/Premium.
- Alimentarse de datos deportivos obtenidos por **scraping** propio y/o por **APIs de terceros** (API-Football, football-data.org, Odds API, Sportmonks), seleccionables por configuración.

El frontend (OddsMatrix) tiene dos pantallas principales que guían el diseño de datos:

- **Monthly Matches**: grilla de partidos del mes por competición, con pick del modelo, cuota, barra de probabilidad 1X2 y filtros *All / Upcoming / High edge*.
- **Match Intelligence**: detalle de un partido con probabilidad de victoria, Home/Draw/Away con *fair odds*, total de goles (Over 2.5, total proyectado, rango del modelo, confianza), player shots on target, distribución de córners, pestañas *Main Markets / Team Stats / Player Props*, y barra lateral con próximos partidos.
- Barra lateral global: estado del modelo (`V4.2 Engine`, *Accuracy / 30d*), estado de la API y *Last sync*.

## 2. Stack

| Tecnología | Uso |
|---|---|
| Node.js 20+ LTS | Runtime |
| **NestJS** | Framework principal — arquitectura modular, DI, decorators, Swagger integrado |
| TypeScript | Lenguaje principal |
| **pnpm** | Gestor de paquetes |
| @nestjs/mongoose (Mongoose) | ODM para MongoDB |
| class-validator / class-transformer | Validación y transformación de DTOs |
| @nestjs/config | Configuración vía variables de entorno |
| @nestjs/passport + passport-jwt + bcrypt | Autenticación JWT |
| @nestjs/swagger | Documentación OpenAPI/Swagger automática |
| @nestjs/schedule | Cron jobs simples de ingesta |
| @nestjs/bullmq + Redis | Cola de jobs para ingesta con reintentos/backoff (recomendado en producción) |
| axios (o undici) | Llamadas HTTP a APIs de fútbol |
| cheerio | Parseo HTML para scraping estático |
| playwright | Scraping de sitios con renderizado JS (SPA) |
| jstat (o implementación propia) | Distribución de Poisson — Node no trae equivalente a NumPy/SciPy |
| jest + supertest | Testing |

### ¿Por qué NestJS?

NestJS aporta justo lo que este proyecto necesita sin depender de Python: arquitectura modular con inyección de dependencias (encaja natural con el patrón domain/application/infrastructure), DTOs validados con decorators, Swagger generado automáticamente, y un sistema de *providers* propio de Nest que resuelve muy bien el patrón "elegir entre scraping o API según configuración" (ver sección 4). Todo el dominio vive en MongoDB vía Mongoose, sin necesidad de una base relacional aparte.

**Modo mock:** si `MONGODB_URI` no está configurada, el backend arranca con datos de ejemplo en memoria (equipos, jugadores, partidos, cuotas), para poder correr el MVP sin credenciales reales.

## 3. Estructura de carpetas

```
backend/
├── src/
│   ├── main.ts                       # bootstrap de Nest, Swagger, pipes globales
│   ├── app.module.ts
│   ├── config/
│   │   └── configuration.ts          # config vía @nestjs/config
│   ├── common/
│   │   ├── guards/                   # jwt-auth.guard.ts
│   │   ├── decorators/               # @CurrentUser(), etc.
│   │   └── filters/                  # exception filters globales
│   ├── modules/
│   │   ├── auth/
│   │   ├── matches/
│   │   ├── predictions/
│   │   ├── players/
│   │   ├── odds/
│   │   ├── system/                   # health, estado del modelo, last sync
│   │   └── ingest/                   # dispara refresco manual de datos
│   ├── domain/
│   │   └── schemas/                  # Mongoose: User, Competition, Team, TeamSeasonStats,
│   │                                 #   Player, Match, MatchTeamStats, OddsSnapshot,
│   │                                 #   Prediction, ModelMetrics, IngestRun
│   ├── infrastructure/
│   │   ├── providers/                # ApiFootballProvider, FootballDataProvider, OddsApiProvider, SportmonksProvider
│   │   ├── scraping/                 # scrapers con cheerio / playwright
│   │   ├── data-source.provider.ts   # factory provider de Nest: elige según DATA_SOURCE
│   │   └── mock/
│   │       └── mock-data.ts
│   ├── ml/
│   │   ├── poisson.service.ts        # lambda, P(exacto), over/under, 1X2
│   │   ├── monte-carlo.service.ts    # simulación de goles/córners/tiros/tarjetas
│   │   └── prediction-engine.service.ts
│   └── jobs/
│       └── ingest.processor.ts       # cron (@nestjs/schedule) o worker (BullMQ)
├── test/
├── models/{trained,datasets}
├── scripts/
│   ├── seed-data.ts                  # carga datos de ejemplo en Mongo
│   ├── create-indexes.ts             # índices + colección time-series de cuotas
│   ├── import-data.ts
│   └── train-models.ts
├── .env.example
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## 4. Fuentes de datos: scraping y/o API de fútbol

El dato deportivo (partidos, alineaciones, estadísticas, cuotas) puede venir de varios orígenes intercambiables, definidos por una interfaz común y resueltos con el sistema de *providers* de Nest (inyección de dependencias, no si/else desperdigados por el código):

```typescript
// src/infrastructure/providers/match-data-provider.interface.ts
export interface MatchDataProvider {
  getCompetitionMatches(competitionId: string, season: number): Promise<MatchDto[]>;
  getTodayMatches(): Promise<MatchDto[]>;
  getMatchStats(matchId: string): Promise<MatchStatsDto>;
  getTeamSeasonStats(teamId: string, season: number): Promise<TeamSeasonStatsDto>;
  getPlayers(teamId: string, season: number): Promise<PlayerDto[]>;
  getOdds(matchId: string): Promise<OddsDto>;
}
```

Implementaciones posibles:

- **`ApiFootballProvider` / `FootballDataProvider` / `OddsApiProvider` / `SportmonksProvider`** — consumen la API oficial correspondiente vía `axios`. Es la opción más estable y con menos mantenimiento; recomendada como fuente principal, sobre todo para **cuotas de mercado** (dato muy sensible a cambios de estructura de la página si se scrapea). Ver sección 6.
- **`ScrapingProvider`** — obtiene datos de sitios públicos con `cheerio` para HTML estático, o `playwright` si el sitio renderiza con JS. Útil para complementar datos que la API no cubre (ej. estadísticas avanzadas, lesiones) o como fuente principal si no hay presupuesto para una API paga.
- **`MockProvider`** — datos de ejemplo en memoria, para desarrollo sin credenciales.

La fuente activa se elige por variable de entorno, resuelta con un *factory provider* de Nest:

```
DATA_SOURCE=api_football   # api_football | football_data | scraping | mock
```

```typescript
// src/infrastructure/data-source.provider.ts
export const MatchDataProviderFactory: Provider = {
  provide: 'MATCH_DATA_PROVIDER',
  useFactory: (config: ConfigService): MatchDataProvider => {
    switch (config.get<string>('DATA_SOURCE')) {
      case 'api_football':
        return new ApiFootballProvider(config.get('FOOTBALL_API_KEY'));
      case 'football_data':
        return new FootballDataProvider(config.get('FOOTBALL_DATA_TOKEN'));
      case 'scraping':
        return new ScrapingProvider();
      default:
        return new MockProvider();
    }
  },
  inject: [ConfigService],
};
```

Cualquier servicio que necesite datos deportivos inyecta `@Inject('MATCH_DATA_PROVIDER') private provider: MatchDataProvider`, sin saber si por debajo hay scraping o una API.

### Ingesta desacoplada del request (importante)

Scrapear o llamar a una API externa **dentro** del request del usuario es frágil y lento (si la fuente cae o tarda, tu API cae o tarda con ella). El patrón correcto:

1. Un **job periódico** corre el provider activo cada N minutos, normaliza los datos al esquema propio (`Match`, `Team`, `OddsSnapshot`, etc.) y los persiste en Mongo. Para algo simple, `@nestjs/schedule` con un `@Cron()` alcanza; si necesitás reintentos, backoff y varios workers en paralelo, usá `@nestjs/bullmq` con Redis. Cada corrida deja un registro en `ingest_runs` (alimenta el "Last sync" y el "API Status" de la UI).
2. Los **endpoints de la API siempre leen de Mongo** (nunca scrapean ni llaman a la API externa en tiempo real dentro de un request). Esto da velocidad constante y aísla al usuario de fallos de la fuente.
3. Si un endpoint necesita un dato que todavía no fue ingerido, se dispara la ingesta puntual de ese partido en background y se responde igual con lo último disponible mientras se actualiza.

Notas prácticas sobre scraping:

- Revisar los Términos de Servicio del sitio antes de scrapearlo; si el uso es comercial (vender pronósticos), preferir una API oficial de pago para cuotas de mercado en lugar de depender de scraping.
- Respetar `robots.txt`, aplicar rate-limiting y cachear agresivamente para minimizar la carga sobre el sitio origen.
- Identificar tu scraper con un User-Agent propio y logs de lo que se consulta, para poder auditar y ajustar si el sitio cambia de estructura.

## 5. Base de datos (MongoDB)

Base: `sports_predictions`. Se diseñó a partir de lo que muestran las pantallas de OddsMatrix: cada elemento de la UI sale de un campo concreto.

### 5.1 Principios de diseño

1. **IDs propios + IDs externos.** Cada documento tiene su `_id` (ObjectId) y un objeto `externalIds` (`{ apiFootball: 33, footballData: 57, sportmonks: 19 }`). Así se puede cambiar o combinar de proveedor sin romper referencias ni predicciones históricas.
2. **Embeber lo que se lee junto, referenciar lo que crece.** El pronóstico completo de un partido se guarda como **un solo documento** (`predictions`) porque la pantalla *Match Intelligence* lo lee entero. Las cuotas, que se acumulan en el tiempo, van en una colección aparte.
3. **Versionar las predicciones.** Nunca se sobrescriben: cada corrida del motor crea un documento nuevo con `modelVersion` y `generatedAt`. Esto permite calcular el *Accuracy / 30d* y mostrar historial.
4. **Desnormalizar lo que se pinta en listas.** `matches` guarda un resumen del pick (`pickSummary`) para que la grilla mensual cargue sin hacer `$lookup` por cada tarjeta.

### 5.2 Colecciones

| Colección | Qué guarda | Qué parte de la UI alimenta |
|---|---|---|
| `users` | Cuenta, hash de contraseña, rol, plan Free/Premium | Login, perfil (esquina inferior izquierda) |
| `competitions` | Liga/copa, país, temporada actual | Título "Premier League", "Matchday 28", breadcrumb |
| `teams` | Nombre, código (ARS, CHE), escudo, colores | Escudos y códigos en las tarjetas |
| `team_season_stats` | Posición, forma (W/D/L), ataque/defensa, promedios de córners/tiros/tarjetas por equipo y temporada | "HOME · 2ND", racha WWDWW, entradas del cálculo de lambda |
| `players` | Jugador, equipo, posición, promedios de tiros y tiros al arco | Pestaña *Player Props* |
| `matches` | Fixture, fecha/hora, estado, equipos, resultado, resumen del pick | *Monthly Matches*, *Upcoming Matches* |
| `match_team_stats` | Estadísticas reales por equipo y partido (córners, tiros, tarjetas, posesión, xG) | Histórico para entrenar y recalibrar el modelo |
| `odds_snapshots` | Cuotas por casa de apuestas, mercado y momento (*time-series*) | `@ 1.84`, EV, detección de *High edge* |
| `predictions` | Salida completa del motor (ver 5.4) | Todo *Match Intelligence* |
| `model_metrics` | Accuracy, Brier score y log-loss por versión y ventana (7d/30d/90d) | "V4.2 Engine · Accuracy / 30d 76.8%" |
| `ingest_runs` | Cada corrida de ingesta: proveedor, estado, duración, requests usados | "DATA LIVE · Last sync 14:32:08", "API Status" |

### 5.3 `matches`

```json
{
  "_id": "ObjectId",
  "externalIds": { "apiFootball": 1208021 },
  "competitionId": "ObjectId",
  "season": 2024,
  "round": "Regular Season - 28",
  "kickoff": "2025-03-08T15:00:00Z",
  "status": "scheduled",
  "homeTeamId": "ObjectId",
  "awayTeamId": "ObjectId",
  "homeTeam": { "name": "Arsenal", "code": "ARS" },
  "awayTeam": { "name": "Chelsea", "code": "CHE" },
  "score": { "home": null, "away": null },
  "pickSummary": {
    "predictionId": "ObjectId",
    "pick": "HOME",
    "pickCode": "ARS",
    "odds": 1.84,
    "homeWinProb": 0.45,
    "drawProb": 0.25,
    "awayWinProb": 0.30,
    "maxEV": 0.12,
    "hasValue": true
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

`status`: `scheduled | live | finished | postponed | cancelled`. `homeTeam`/`awayTeam` se duplican a propósito (nombre y código) para pintar la grilla sin joins. El filtro *High edge* es simplemente `pickSummary.hasValue: true`.

### 5.4 `predictions`

```json
{
  "_id": "ObjectId",
  "matchId": "ObjectId",
  "modelName": "poisson_monte_carlo",
  "modelVersion": "4.2.0",
  "simulationsRun": 20000,
  "generatedAt": "Date",
  "isLatest": true,

  "lambdas": { "homeGoals": 1.8, "awayGoals": 1.4, "homeCorners": 5.4, "awayCorners": 4.1 },

  "result1x2": {
    "home": { "prob": 0.45, "fairOdds": 2.22 },
    "draw": { "prob": 0.25, "fairOdds": 4.00 },
    "away": { "prob": 0.30, "fairOdds": 3.33 }
  },

  "totalGoals": {
    "line": 2.5,
    "selection": "over",
    "prob": 0.80,
    "confidence": 0.80,
    "projectedTotal": 3.2,
    "range": { "min": 2.7, "max": 3.8 }
  },

  "corners": {
    "projectedTotal": 9.5,
    "range": { "min": 8, "max": 10 },
    "distribution": [
      { "value": 5, "prob": 0.03 }, { "value": 7, "prob": 0.07 },
      { "value": 8, "prob": 0.16 }, { "value": 9, "prob": 0.22 },
      { "value": 10, "prob": 0.18 }, { "value": 13, "prob": 0.04 }
    ]
  },

  "markets": [
    {
      "market": "corners",
      "selection": "over_8.5",
      "prob": 0.68,
      "confidence": 0.74,
      "bestOdds": 1.85,
      "bookmaker": "bet365",
      "impliedProb": 0.54,
      "expectedValue": 0.258,
      "isValueBet": true
    }
  ],

  "playerProps": [
    { "playerId": "ObjectId", "name": "Bukayo Saka", "market": "shots", "line": 2, "label": "2+ shots", "prob": 0.82 },
    { "playerId": "ObjectId", "name": "Cole Palmer", "market": "shots_on_target", "line": 1, "label": "1+ SOT", "prob": 0.74 }
  ],

  "tags": ["featured", "high_edge"]
}
```

Notas:

- `fairOdds = 1 / prob`. Es la cuota "justa" del modelo; se compara contra `bestOdds` de `odds_snapshots` para calcular el EV.
- `corners.distribution` es el histograma de las 20.000 simulaciones: alimenta directamente las barras del gráfico de córners.
- `isLatest` marca la predicción vigente de cada partido (al generar una nueva, la anterior pasa a `false`).
- `playerProps` va embebido porque es una lista corta (top picks) y siempre se lee junto con el partido.

### 5.5 `odds_snapshots` (colección time-series)

```json
{
  "ts": "Date",
  "meta": { "matchId": "ObjectId", "bookmaker": "bet365", "market": "1x2", "selection": "home", "line": null },
  "price": 1.84
}
```

```typescript
// scripts/create-indexes.ts
await db.createCollection('odds_snapshots', {
  timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'minutes' },
  expireAfterSeconds: 60 * 60 * 24 * 90, // conservar 90 días
});
```

Guarda el historial de movimiento de cuotas sin inflar `matches`. La cuota "actual" que se muestra se copia a `pickSummary.odds` y a `predictions.markets[].bestOdds` cada vez que corre la ingesta.

### 5.6 Resto de colecciones (campos principales)

```
users               { email (único), passwordHash, role: user|admin, plan: free|premium,
                      planExpiresAt, createdAt }
competitions        { externalIds, name, country, season, currentRound, logoUrl }
teams               { externalIds, name, shortName, code, crestUrl, competitionIds[], colors }
team_season_stats   { teamId, competitionId, season, rank, form: ["W","W","D","L","W"],
                      home: { played, goalsFor, goalsAgainst, corners, shots, cards },
                      away: { ... },
                      strength: { attack, defense } }          // insumos del lambda
players             { externalIds, teamId, name, position, shirtNumber,
                      season, avg: { shots, shotsOnTarget, minutes }, injured }
match_team_stats    { matchId, teamId, side, goals, xg, shots, shotsOnTarget,
                      corners, yellowCards, redCards, possession }
model_metrics       { modelVersion, window: "30d", accuracy, brierScore, logLoss,
                      sampleSize, computedAt }
ingest_runs         { provider, job, status: ok|error|partial, startedAt, finishedAt,
                      requestsUsed, itemsUpserted, error }
```

### 5.7 Índices

```typescript
users.createIndex({ email: 1 }, { unique: true });

matches.createIndex({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });
matches.createIndex({ competitionId: 1, kickoff: 1 });            // Monthly Matches
matches.createIndex({ status: 1, kickoff: 1 });                   // Upcoming / today
matches.createIndex({ 'pickSummary.hasValue': 1, kickoff: 1 });   // filtro High edge

predictions.createIndex({ matchId: 1, isLatest: 1 });
predictions.createIndex({ matchId: 1, generatedAt: -1 });         // historial
predictions.createIndex({ 'markets.isValueBet': 1, generatedAt: -1 }); // GET /predictions/value

teams.createIndex({ 'externalIds.apiFootball': 1 }, { unique: true, sparse: true });
team_season_stats.createIndex({ teamId: 1, season: 1 }, { unique: true });
players.createIndex({ teamId: 1, season: 1 });
match_team_stats.createIndex({ matchId: 1, teamId: 1 }, { unique: true });
model_metrics.createIndex({ modelVersion: 1, window: 1, computedAt: -1 });
ingest_runs.createIndex({ startedAt: -1 });
```

### 5.8 Ejemplo de schema Mongoose

```typescript
// src/domain/schemas/match.schema.ts
@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Object, default: {} }) externalIds: Record<string, number>;
  @Prop({ type: Types.ObjectId, ref: 'Competition', index: true }) competitionId: Types.ObjectId;
  @Prop() season: number;
  @Prop() round: string;
  @Prop({ index: true }) kickoff: Date;
  @Prop({ enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'], default: 'scheduled' })
  status: string;
  @Prop({ type: Types.ObjectId, ref: 'Team' }) homeTeamId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Team' }) awayTeamId: Types.ObjectId;
  @Prop({ type: Object }) homeTeam: { name: string; code: string };
  @Prop({ type: Object }) awayTeam: { name: string; code: string };
  @Prop({ type: Object }) score: { home: number | null; away: number | null };
  @Prop({ type: Object }) pickSummary?: Record<string, unknown>;
}
export const MatchSchema = SchemaFactory.createForClass(Match);
```

### 5.9 Mapa UI → datos

| Elemento de la UI | Origen |
|---|---|
| Tarjeta de partido (fecha, escudos, códigos) | `matches` |
| `PICK ARS`, `@ 1.84` | `matches.pickSummary` |
| Barra de probabilidad 1X2 | `matches.pickSummary.homeWinProb / drawProb / awayWinProb` |
| Filtro *High edge* | `matches.pickSummary.hasValue` |
| Anillo "45% HOME WIN" y Home/Draw/Away con *Fair odds* | `predictions.result1x2` |
| Racha WWDWW y "HOME · 2ND" | `team_season_stats.form` y `.rank` |
| Total Goals: Over 2.5, 80%, proyectado 3.2, rango 2.7–3.8 | `predictions.totalGoals` |
| Player Shots on Target (Saka 82%…) | `predictions.playerProps` |
| Total Corners 8–10 + barras | `predictions.corners` |
| Pestaña Team Stats (Corners/Cards) | `team_season_stats` + `predictions.markets` |
| Upcoming Matches (lateral) | `matches` con `status: scheduled`, ordenados por `kickoff` |
| V4.2 Engine · Accuracy / 30d | `model_metrics` (última por versión) |
| DATA LIVE · Last sync / API Status | `ingest_runs` (última corrida) |

## 6. APIs de datos recomendadas

> Precios y límites verificados en octubre de 2026 en las páginas de cada proveedor y comparativas de terceros. Cambian seguido: confirmalos en la web oficial antes de contratar.

### 6.1 Comparativa

| API | Plan gratis | Plan de pago de entrada | Qué aporta al proyecto |
|---|---|---|---|
| **API-Football** (api-football.com) | 100 req/día, todos los endpoints (temporadas disponibles limitadas) | Pro $19/mes · 7.500 req/día | Fixtures, equipos, standings, jugadores, estadísticas por partido (córners, tiros, tarjetas), lineups, lesiones, cuotas y un endpoint propio de predicciones |
| **football-data.org** | 12 competiciones, 10 req/min, sin estadísticas de jugador | Desde ~€29/mes | Fixtures, resultados y tablas de las ligas principales; buena para prototipar el calendario mensual |
| **Sportmonks** | Plan gratis muy limitado | Prueba de 14 días; planes por ligas (Starter ~€29/mes con pocas ligas) | Cobertura amplia, xG, cuotas; precio por ligas y add-ons |
| **TheStatsAPI** | Solo prueba de 7 días | Desde $50/mes · 100k req/mes | Todos los endpoints en cada plan: xG, stats de jugador, cuotas de varias casas |
| **The Odds API** (the-odds-api.com) | Plan gratuito con créditos mensuales limitados | Planes de pago por créditos | Especializada en **cuotas** de múltiples casas; útil si la fuente principal no trae buenas cuotas |

### 6.2 Qué usar para este proyecto

**Recomendación MVP:** `API-Football` como fuente única para partidos, equipos, jugadores y estadísticas (cubre todo lo que muestran las pantallas), y sumar `The Odds API` solo si las cuotas de API-Football no alcanzan. Para pasar a producción con usuarios reales, el plan Pro ($19/mes) es el escalón natural; los 100 req/día del plan gratis sirven para desarrollo, no para tráfico real.

**Si querés ahorrar al máximo:** `football-data.org` para el calendario y resultados de la Premier League (gratis) y completar estadísticas con scraping o con un plan de pago más adelante. Tené en cuenta que sus datos de jugadores (tiros, tarjetas) son limitados en el plan gratis, y que el uso comercial puede tener condiciones: revisalas.

### 6.3 Endpoints de API-Football y su destino en Mongo

| Endpoint | Frecuencia sugerida | Escribe en |
|---|---|---|
| `GET /leagues` | 1 vez por temporada | `competitions` |
| `GET /teams?league=39&season=2024` | 1 vez por temporada | `teams` |
| `GET /fixtures?league=39&season=2024` | Cada hora (1 request trae toda la temporada) | `matches` |
| `GET /standings?league=39&season=2024` | Diario | `team_season_stats` (rank, forma) |
| `GET /teams/statistics?league=39&season=2024&team=42` | Diario (20 requests) | `team_season_stats` (promedios, fuerza ataque/defensa) |
| `GET /players?league=39&season=2024&page=N` | Semanal (paginado de a 20) | `players` |
| `GET /fixtures/statistics?fixture=ID` | Una vez al terminar cada partido | `match_team_stats` |
| `GET /odds?fixture=ID` | Cada 15–60 min cerca del partido | `odds_snapshots` |
| `GET /injuries?fixture=ID` | Antes del partido | `players.injured` |

(39 = Premier League en API-Football; el número de temporada depende de cómo cuente cada plan, verificalo con tu key.)

### 6.4 Presupuesto de requests (plan gratis: 100/día)

- Calendario del mes: **1 request** (`/fixtures` por liga y temporada).
- Standings: **1**. Estadísticas de equipos: **20**. Plantillas de jugadores: ~**30** (paginado), una vez por semana.
- Cuotas: **1 por partido** y por corrida, así que hay que limitarse a los partidos de las próximas 24–48 h.

Con esto el plan gratis alcanza para un entorno de desarrollo con una sola liga. Leé siempre los headers `x-ratelimit-requests-remaining` y registralos en `ingest_runs.requestsUsed` para no quedarte sin cupo; cuando se agota, las requests simplemente fallan hasta el reinicio diario (medianoche UTC).

### 6.5 Buenas prácticas con proveedores

- Implementar un solo `Provider` por API detrás de `MatchDataProvider`, y **mapear siempre al esquema propio** (nunca guardar la respuesta cruda como modelo de dominio; si hace falta, guardarla aparte para depuración).
- Usar `upsert` por `externalIds.<proveedor>` para que la ingesta sea idempotente.
- No llamar a la API desde endpoints de usuario (ver sección 4).
- Revisar los términos de uso de cada API para venta de pronósticos y redistribución de cuotas.

## 7. Motor de predicción (Poisson + Monte Carlo)

### 7.1 Paso 1 — Estimación de lambda (Poisson)

```
lambda = promedio( ataque_propio , debilidad_defensiva_rival ) * factor_localia
```

Los insumos salen de `team_season_stats` (fuerza de ataque/defensa, promedios de córners y tarjetas). Se usa como línea base analítica para goles, córners y tarjetas, y para un cálculo rápido de 1X2 mediante una matriz de Poisson bivariada.

### 7.2 Paso 2 — Simulación Monte Carlo

En vez de asumir independencia perfecta entre eventos (goles, tiros, córners, tarjetas), el motor:

1. Toma los lambdas estimados por Poisson para cada equipo/mercado.
2. Simula N partidos virtuales (por defecto `MONTE_CARLO_SIMULATIONS=20000`) muestreando de distribuciones de Poisson correlacionadas (ej. más posesión y ataques peligrosos → más tiros y más córners).
3. Cuenta la frecuencia de cada resultado (victoria/empate/derrota, over/under de goles, córners, tarjetas, tiros de jugador) sobre el total de simulaciones.
4. Esa frecuencia relativa es la probabilidad estimada del evento.

```
Datos (lambdas por mercado)
        ↓
Generar N simulaciones de partido
        ↓
Contar frecuencia de cada resultado
        ↓
Probabilidad = frecuencia / N simulaciones
```

Node no trae un equivalente directo a NumPy/SciPy: `poisson.service.ts` implementa el muestreo con el algoritmo de Knuth (simple con `Math.random()`) o usando `jstat` para la PMF exacta cuando se necesita el cálculo analítico en vez de simulado.

Esto permite capturar mercados combinados (ej. "Liverpool gana Y over 2.5 goles") que el modelo analítico puro no resuelve fácilmente. El histograma de simulaciones se guarda tal cual en `predictions.corners.distribution`.

### 7.3 Paso 3 — Expected Value (EV)

```
Probabilidad implícita = 1 / cuota
EV = (Probabilidad_modelo × Cuota) - 1
```

Si `EV > 0` se marca como valor positivo (`isValueBet`), sin presentarlo como garantía de ganancia.

### 7.4 Salida del motor

La salida se persiste en `predictions` con la forma descrita en la sección 5.4.

### 7.5 Seguimiento de precisión

Un job diario compara las predicciones de partidos terminados con el resultado real y escribe en `model_metrics` (accuracy, Brier score, log-loss) por ventana de 7/30/90 días. El número que ve el usuario ("Accuracy / 30d") sale de ahí. Conviene mostrar también el tamaño de muestra (`sampleSize`) para no sobrevender una cifra calculada con pocos partidos.

## 8. Endpoints (MVP)

```
# Autenticación
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

# Partidos
GET  /api/v1/matches?competitionId=&month=2025-03&filter=all|upcoming|high_edge
GET  /api/v1/matches/today
GET  /api/v1/matches/upcoming            # barra lateral "Upcoming Matches"
GET  /api/v1/matches/:matchId

# Predicciones
GET  /api/v1/predictions/:matchId        # Poisson + Monte Carlo + EV (desde Mongo)
GET  /api/v1/predictions/value           # solo mercados con EV positivo
GET  /api/v1/predictions/history

# Jugadores
GET  /api/v1/players/:playerId
GET  /api/v1/players/:playerId/props     # tiros / tiros al arco esperados

# Cuotas
GET  /api/v1/odds/:matchId

# Estado del sistema (barra lateral de la UI)
GET  /api/v1/system/model                # versión del motor + accuracy 30d
GET  /api/v1/system/status               # DATA LIVE, last sync, estado de la API de datos

# Ingesta (uso interno/admin)
POST /api/v1/admin/ingest/:matchId       # dispara refresco puntual

# Sistema
GET  /api/v1/health                      # servicio, conexión a Mongo y último ingest exitoso
```

## 9. Mercados incluidos en el MVP

- Resultado 1X2.
- Total de goles (over/under).
- Córners totales (over/under).
- Tiros / tiros al arco de jugadores (props).

Tarjetas, props avanzados, alertas y notificaciones quedan para fases posteriores (el esquema ya tiene `yellowCards`/`redCards` en `match_team_stats` para cuando se agreguen).

## 10. Variables de entorno

```
MONGODB_URI=
DATABASE_NAME=sports_predictions

JWT_SECRET=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

DATA_SOURCE=mock                # mock | api_football | football_data | scraping
FOOTBALL_API_KEY=               # API-Football
FOOTBALL_DATA_TOKEN=            # football-data.org
ODDS_API_KEY=
SPORTMONKS_API_KEY=
SCRAPING_USER_AGENT=sports-predictions-bot/1.0
INGEST_INTERVAL_MINUTES=15
ODDS_RETENTION_DAYS=90

REDIS_URL=                      # solo si se usa @nestjs/bullmq para la cola de ingesta

MONTE_CARLO_SIMULATIONS=20000
RANDOM_SEED=42
MODEL_VERSION=4.2.0

NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

Si `MONGODB_URI` queda vacío, el backend usa datos de ejemplo en memoria (modo mock) para poder ejecutarse sin infraestructura externa.

## 11. Cómo correr el backend

```bash
cd backend
pnpm install
cp .env.example .env

pnpm ts-node scripts/create-indexes.ts   # índices y colección time-series de cuotas
pnpm ts-node scripts/seed-data.ts        # datos de ejemplo (Premier League, marzo 2025)
pnpm start:dev
```

Otros scripts útiles:

```bash
pnpm build          # compila a dist/
pnpm start:prod     # corre la build compilada
pnpm test           # unit tests (jest)
pnpm test:e2e       # tests end-to-end (supertest)
pnpm lint           # eslint
```

La documentación interactiva (Swagger, generada automáticamente por `@nestjs/swagger`) queda disponible en:

```
http://localhost:3000/api/docs
```

## 12. Notas de arquitectura

- Todo el dominio (usuarios, partidos, equipos, jugadores, pronósticos, cuotas) vive en MongoDB vía Mongoose; no hay una base relacional salvo que se agregue explícitamente para un módulo que la necesite (ej. facturación).
- La conexión a Mongo se gestiona con `@nestjs/mongoose` en `app.module.ts` (`MongooseModule.forRootAsync`), leyendo la URI desde `ConfigService`.
- La ingesta de datos (scraping y/o API de fútbol) está desacoplada del ciclo request/response: corre en jobs periódicos y deja los datos listos en Mongo; los endpoints solo leen.
- El motor de predicción (Poisson + Monte Carlo) es indiferente al origen del dato: solo necesita los `lambdas` normalizados, así que cambiar de proveedor de datos (o combinar varios) no afecta a `prediction-engine.service.ts`. Gracias a `externalIds`, tampoco se rompen referencias al cambiar de proveedor.
- Las predicciones son inmutables y versionadas: nunca se editan, se generan nuevas. Eso hace auditable el rendimiento del modelo.
- Los DTOs con `class-validator` validan automáticamente cada request gracias al `ValidationPipe` global configurado en `main.ts`; no hace falta validar a mano en cada controller.
