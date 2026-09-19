⚽ Backend — Plataforma de Pronósticos Deportivos con IA
Backend en **NestJS (TypeScript) + MongoDB** (motor Poisson / Monte Carlo) para una plataforma de analítica y pronósticos deportivos, con ingesta de datos vía **scraping** y/o **API de fútbol**. Gestionado con **pnpm**.

⚠️ Los pronósticos son estimaciones probabilísticas, no garantías de resultado.

## 1. Resumen

Este backend expone una API REST para:

- Consultar partidos, equipos y jugadores.
- Generar pronósticos probabilísticos (goles, córners, tiros, tarjetas, player props) usando un motor Poisson + Monte Carlo.
- Comparar las probabilidades del modelo contra cuotas de mercado y calcular Expected Value (EV).
- Gestionar usuarios, autenticación (JWT) y planes Free/Premium.
- Alimentarse de datos deportivos obtenidos por **scraping** propio y/o por **APIs de terceros** (API-Football, Odds API, Sportmonks), seleccionables por configuración.

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

NestJS aporta justo lo que este proyecto necesita sin depender de Python: arquitectura modular con inyección de dependencias (encaja natural con el patrón domain/application/infrastructure que ya tenías), DTOs validados con decorators, Swagger generado automáticamente, y un sistema de *providers* propio de Nest que resuelve muy bien el patrón "elegir entre scraping o API según configuración" (ver sección 4). Todo el dominio sigue viviendo en MongoDB vía Mongoose, sin necesidad de una base relacional aparte.

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
│   │   ├── decorators/                # @CurrentUser(), etc.
│   │   └── filters/                   # exception filters globales
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/            # jwt.strategy.ts, local.strategy.ts
│   │   │   └── dto/
│   │   ├── matches/
│   │   │   ├── matches.module.ts
│   │   │   ├── matches.controller.ts
│   │   │   ├── matches.service.ts
│   │   │   └── dto/
│   │   ├── predictions/
│   │   │   ├── predictions.module.ts
│   │   │   ├── predictions.controller.ts
│   │   │   ├── predictions.service.ts
│   │   │   └── dto/
│   │   ├── players/
│   │   ├── odds/
│   │   └── ingest/                    # dispara refresco manual de datos
│   ├── domain/
│   │   └── schemas/                   # Mongoose schemas: User, Team, Player, Match, Prediction, Odds
│   ├── infrastructure/
│   │   ├── providers/                 # ApiFootballProvider, OddsApiProvider, SportmonksProvider
│   │   ├── scraping/                  # scrapers con cheerio / playwright
│   │   ├── data-source.provider.ts    # factory provider de Nest: elige según DATA_SOURCE
│   │   └── mock/
│   │       └── mock-data.ts
│   ├── ml/
│   │   ├── poisson.service.ts         # lambda, P(exacto), over/under, 1X2
│   │   ├── monte-carlo.service.ts     # simulación de goles/córners/tiros/tarjetas
│   │   └── prediction-engine.service.ts
│   └── jobs/
│       └── ingest.processor.ts        # cron (@nestjs/schedule) o worker (BullMQ) de ingesta periódica
├── test/
├── models/{trained,datasets}
├── scripts/
│   ├── seed-data.ts                   # carga datos de ejemplo en Mongo
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

El dato deportivo (partidos, alineaciones, estadísticas, cuotas) puede venir de dos orígenes intercambiables, definidos por una interfaz común y resueltos con el sistema de *providers* de Nest (inyección de dependencias, no si/else desperdigados por el código):

```typescript
// src/infrastructure/providers/match-data-provider.interface.ts
export interface MatchDataProvider {
  getTodayMatches(): Promise<MatchDto[]>;
  getMatchStats(matchId: string): Promise<MatchStatsDto>;
  getOdds(matchId: string): Promise<OddsDto>;
}
```

Implementaciones posibles:

- **`ApiFootballProvider` / `OddsApiProvider` / `SportmonksProvider`** — consumen la API oficial correspondiente vía `axios`. Es la opción más estable y con menos mantenimiento; recomendada como fuente principal, sobre todo para **cuotas de mercado** (dato muy sensible a cambios de estructura de la página si se scrapea).
- **`ScrapingProvider`** — obtiene datos de sitios públicos con `cheerio` para HTML estático, o `playwright` si el sitio renderiza con JS. Útil para complementar datos que la API no cubre (ej. estadísticas avanzadas, lesiones) o como fuente principal si no hay presupuesto para una API paga.
- **`MockProvider`** — datos de ejemplo en memoria, igual que antes, para desarrollo sin credenciales.

La fuente activa se elige por variable de entorno, resuelta con un *factory provider* de Nest:

```
DATA_SOURCE=api_football   # api_football | scraping | mock
```

```typescript
// src/infrastructure/data-source.provider.ts
export const MatchDataProviderFactory: Provider = {
  provide: 'MATCH_DATA_PROVIDER',
  useFactory: (config: ConfigService): MatchDataProvider => {
    switch (config.get<string>('DATA_SOURCE')) {
      case 'api_football':
        return new ApiFootballProvider(config.get('FOOTBALL_API_KEY'));
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

1. Un **job periódico** corre el provider activo cada N minutos, normaliza los datos al esquema propio (`Match`, `Team`, `Odds`, etc.) y los persiste en Mongo. Para algo simple, `@nestjs/schedule` con un `@Cron()` alcanza; si necesitás reintentos, backoff y varios workers en paralelo, usá `@nestjs/bullmq` con Redis.
2. Los **endpoints de la API siempre leen de Mongo** (nunca scrapean ni llaman a la API externa en tiempo real dentro de un request). Esto da velocidad constante y aísla al usuario de fallos de la fuente.
3. Si un endpoint necesita un dato que todavía no fue ingerido, se dispara la ingesta puntual de ese partido en background y se responde igual con lo último disponible en caché mientras se actualiza.

Notas prácticas sobre scraping:

- Revisar los Términos de Servicio del sitio antes de scrapearlo; si el uso es comercial (vender pronósticos), preferir una API oficial de pago para cuotas de mercado en lugar de depender de scraping.
- Respetar `robots.txt`, aplicar rate-limiting y cachear agresivamente para minimizar la carga sobre el sitio origen.
- Identificar tu scraper con un User-Agent propio y logs de lo que se consulta, para poder auditar y ajustar si el sitio cambia de estructura.

## 5. Motor de predicción (Poisson + Monte Carlo)

### 5.1 Paso 1 — Estimación de lambda (Poisson)

```
lambda = promedio( ataque_propio , debilidad_defensiva_rival ) * factor_localia
```

Se usa como línea base analítica para goles, córners y tarjetas, y para un cálculo rápido de 1X2 mediante una matriz de Poisson bivariada.

### 5.2 Paso 2 — Simulación Monte Carlo

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

Esto permite capturar mercados combinados (ej. "Liverpool gana Y over 2.5 goles") que el modelo analítico puro no resuelve fácilmente.

### 5.3 Paso 3 — Expected Value (EV)

```
Probabilidad implícita = 1 / cuota
EV = (Probabilidad_modelo × Cuota) - 1
```

Si `EV > 0` se marca como valor positivo, sin presentarlo como garantía de ganancia.

### 5.4 Salida del motor

```json
{
  "matchId": "12345",
  "simulationsRun": 20000,
  "lambdas": {
    "homeGoals": 1.8,
    "awayGoals": 1.1,
    "homeCorners": 5.4,
    "awayCorners": 4.1
  },
  "markets": [
    {
      "market": "corners",
      "selection": "over_8.5",
      "probability": 0.68,
      "confidence": 0.74,
      "odds": 1.85,
      "impliedProbability": 0.54,
      "expectedValue": 0.258,
      "isValueBet": true
    }
  ],
  "model": { "name": "poisson_monte_carlo", "version": "1.0.0" }
}
```

## 6. Endpoints (MVP)

```
# Autenticación
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

# Partidos
GET  /api/v1/matches
GET  /api/v1/matches/today
GET  /api/v1/matches/:matchId

# Predicciones
GET  /api/v1/predictions/:matchId        # recupera Poisson + Monte Carlo + EV (desde Mongo)
GET  /api/v1/predictions/value           # solo mercados con EV positivo
GET  /api/v1/predictions/history

# Jugadores
GET  /api/v1/players/:playerId
GET  /api/v1/players/:playerId/props     # tiros / tiros al arco esperados

# Cuotas
GET  /api/v1/odds/:matchId

# Ingesta (uso interno/admin)
POST /api/v1/admin/ingest/:matchId       # dispara refresco puntual

# Sistema
GET  /api/v1/health                      # estado del servicio, conexión a Mongo y último ingest exitoso
```

## 7. Mercados incluidos en el MVP

- Resultado 1X2.
- Total de goles (over/under).
- Córners totales (over/under).
- Tiros / tiros al arco de jugadores (props).

Tarjetas, props avanzados, alertas y notificaciones quedan para fases posteriores.

## 8. Variables de entorno

```
MONGODB_URI=
DATABASE_NAME=sports_predictions

JWT_SECRET=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

DATA_SOURCE=mock                # mock | api_football | scraping
FOOTBALL_API_KEY=
ODDS_API_KEY=
SPORTMONKS_API_KEY=
SCRAPING_USER_AGENT=sports-predictions-bot/1.0
INGEST_INTERVAL_MINUTES=15

REDIS_URL=                      # solo si se usa @nestjs/bullmq para la cola de ingesta

MONTE_CARLO_SIMULATIONS=20000
RANDOM_SEED=42

NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

Si `MONGODB_URI` queda vacío, el backend usa datos de ejemplo en memoria (modo mock) para poder ejecutarse sin infraestructura externa.

## 9. Cómo correr el backend

```bash
cd backend
pnpm install
cp .env.example .env

pnpm start:dev
```

Otros scripts útiles:

```bash
pnpm build          # compila a dist/
pnpm start:prod      # corre la build compilada
pnpm test            # unit tests (jest)
pnpm test:e2e        # tests end-to-end (supertest)
pnpm lint            # eslint
```

La documentación interactiva (Swagger, generada automáticamente por `@nestjs/swagger`) queda disponible en:

```
http://localhost:3000/api/docs
```

## 10. Notas de arquitectura

- Todo el dominio (usuarios, partidos, equipos, jugadores, pronósticos, cuotas) vive en MongoDB vía Mongoose; no hay una base relacional salvo que se agregue explícitamente para un módulo que la necesite (ej. facturación).
- La conexión a Mongo se gestiona con `@nestjs/mongoose` en `app.module.ts` (`MongooseModule.forRootAsync`), leyendo la URI desde `ConfigService`.
- La ingesta de datos (scraping y/o API de fútbol) está desacoplada del ciclo request/response: corre en jobs periódicos y deja los datos listos en Mongo; los endpoints solo leen. Esto hace que la API responda rápido y no dependa de la disponibilidad de la fuente externa en cada request.
- El motor de predicción (Poisson + Monte Carlo) es indiferente al origen del dato: solo necesita los `lambdas` normalizados, así que cambiar de proveedor de datos (o combinar varios) no afecta a `prediction-engine.service.ts`.
- Los DTOs con `class-validator` validan automáticamente cada request gracias al `ValidationPipe` global configurado en `main.ts`; no hace falta validar a mano en cada controller.