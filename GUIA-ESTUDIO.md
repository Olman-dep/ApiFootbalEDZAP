# Guía de estudio — Backend de Pronósticos Deportivos (ApiFootbalEDZAP)

Esta guía explica, en lenguaje claro, cómo está organizado el proyecto, cómo funciona hoy con datos de ejemplo (mock) y qué se hizo en cada paso con su commit correspondiente. Sirve para estudiar el proyecto sin tener que leer todo el código.

> Nota: el `README.md` describe la arquitectura **objetivo** (MongoDB, JWT, scraping…). Gran parte de eso todavía no existe. Esta guía describe el estado **real** del código.

---

## 1. ¿Qué es este proyecto?

Un backend en **NestJS (TypeScript)** que va a exponer una API REST para:

- Consultar partidos.
- Generar pronósticos probabilísticos (1X2, over/under de goles) usando un modelo **Poisson**.

Hoy el proyecto funciona de punta a punta **sin base de datos ni servicios externos**: los datos son de ejemplo (mock) y viven en memoria.

## 2. Dónde vive el código

- Todo el código real está en la carpeta **`api-f/`**. Todos los comandos (install, test, lint, start) se ejecutan desde ahí.
- El `package.json` de la raíz es un stub (no hace nada): no hay monorepo ni workspaces.
- Rama activa: `develop`. Los commits llevan el prefijo del ticket, por ejemplo `HUU-002:`.

## 3. Arquitectura en corto

NestJS organiza el código en **módulos** (agrupaciones de controllers + services). Los dos módulos que existen hoy:

| Módulo | Qué hace |
|---|---|
| `src/modules/matches` | Devuelve la lista de partidos |
| `src/modules/predictions` | Calcula y devuelve pronósticos de un partido |

Archivos clave y su rol:

- `src/main.ts` — arranque de la app. Lee `PORT` del archivo `.env` (por defecto 3000).
- `src/app.module.ts` — módulo raíz. Carga `ConfigModule` (lector de `.env`, global) e importa los dos módulos.
- `src/infrastructure/data-source.provider.ts` — **fábrica**: decide qué fuente de datos usar según la variable `DATA_SOURCE`.
- `src/infrastructure/mock/mock-data.ts` — `MockProvider`: los datos de ejemplo en memoria (partidos, equipos, estadísticas).
- `src/infrastructure/providers/match-data-provider.interface.ts` — la interfaz (contrato) que toda fuente de datos debe cumplir.
- `src/ml/poisson.service.ts` — motor matemático: calcula probabilidades de victoria/empate/derrota y over/under 2.5 goles.
- `src/modules/predictions/predictions.service.ts` — usa el motor y arma la respuesta del pronóstico.

Patrón importante: los services **no** acceden a los datos directamente. `MatchesService` inyecta el proveedor con `@Inject(MATCH_DATA_PROVIDER)`, y la fábrica decide qué implementación entregar. Cambiar de fuente de datos más adelante no toca los controllers ni los services.

## 4. Cómo funciona con datos mock (flujo paso a paso)

1. Ejecutás `pnpm start:dev` desde `api-f/`. Nest crea la app y `ConfigModule` carga el archivo `.env` (si no existe, igual arranca: todo tiene valor por defecto).
2. Al llegar un request, por ejemplo `GET /matches`, el controller delega en `MatchesService`.
3. `MatchesService` necesita datos, pero solo conoce la interfaz `MatchDataProvider` — no sabe de dónde salen.
4. La fábrica `MatchDataProviderFactory` mira la variable `DATA_SOURCE`:
   - Si es `mock` (o cualquier otro valor hoy) → devuelve un `MockProvider`.
   - Todavía **no existen** proveedores reales (API-Football, scraping, etc.); por eso cualquier valor cae en mock: el camino sin credenciales siempre funciona.
5. `MockProvider` responde con los datos de ejemplo de `mock-data.ts` (todo en memoria, sin red ni base de datos).
6. Para un pronóstico, `PredictionsService` toma esos datos y llama a `PoissonService`, que calcula las probabilidades y el over/under 2.5.

Consecuencia práctica: **nada se persiste**. Si reiniciás la app, los datos siguen siendo los mismos de ejemplo, porque están escritos en el código.

## 5. Archivos de entorno (.env) — dónde está la conexión a la base de datos

Hay dos archivos, ambos dentro de `api-f/`:

| Archivo | Qué es | ¿Está en git? |
|---|---|---|
| `api-f/.env` | Archivo real de configuración local | **No** (está en `.gitignore`: nunca se sube) |
| `api-f/.env.example` | Plantilla visible para el equipo | Sí |

- **La variable de conexión a MongoDB es `MONGODB_URI`** y se define en `api-f/.env`. Hoy está vacía a propósito.
- **Importante:** hoy **ningún código lee `MONGODB_URI`** — Mongoose/MongoDB todavía no están instalados ni implementados. Por lo tanto, completarla ahora **no conectaría nada** todavía.
- **Cómo cambiarla más adelante** (cuando se implemente la parte de base de datos):
  1. Editar `api-f/.env` y poner, por ejemplo: `MONGODB_URI=mongodb://localhost:27017/sports_predictions`.
  2. Ese cambio será suficiente **solo cuando exista el código** que la lea vía `ConfigService` (misma mecánica que ya usan `PORT` y `DATA_SOURCE`).
  3. Mientras tanto, dejarla vacía es lo correcto: la app corre igual con mock.

Otras variables que **sí** se leen hoy:

- `DATA_SOURCE` (por defecto `mock`) — elige la fuente de datos en la fábrica.
- `PORT` (por defecto 3000) — puerto del servidor.

Para modificar cualquier una: editá `api-f/.env` (crealo desde `.env.example` si no existe) y reiniciá la app. El archivo `.env` es local y personal: no se commitea.

## 6. Commits realizados y la razón de cada uno

Historial reciente (de más antiguo a más nuevo):

| Commit | Mensaje | Razón |
|---|---|---|
| `c306de8` | CONFIGURACIONES INICIALES | Renombra `api-foot/` → `api-f/` y acomoda la estructura inicial |
| `c5fcf87` | Contrato, datos mock y cálculo de probabilidades | Primer esqueleto funcional: interfaz de datos, `MockProvider`, módulo `matches` y motor Poisson |
| `939ad59` | Endpoint de probabilidad de victoria | Crea el módulo `predictions` (controller/service/module) |
| `1a3e11d` | Sincroniza README | Actualiza el README con la revisión del remoto (docs, sin código) |
| `583d5a7` | Cálculo over/under 2.5 | Suma el mercado de total de goles al motor Poisson |
| `d0b3769` | Agrega AGENTS.md | Crea el archivo de instrucciones para agentes con guías verificadas del repo |
| `7662324` | Configuración de entorno con @nestjs/config | **Paso 1 de esta tarea** (ver detalle abajo) |
| _(pendiente)_ | Documentación (esta guía) | **Paso 2 de esta tarea** (ver detalle abajo) |

(Los commits anteriores a `c306de8` son la configuración inicial del proyecto, merges y ajustes de README.)

## 7. Detalle de los commits de esta tarea (archivos y motivo)

### Paso 1 — Configuración de entorno y mock explícito · commit `7662324`

| Archivo | Motivo del cambio |
|---|---|
| `api-f/package.json` | Agrega la dependencia `@nestjs/config` (lector de archivos `.env`) |
| `api-f/pnpm-lock.yaml` | Se regenera al instalar la dependencia anterior |
| `api-f/src/app.module.ts` | Registra `ConfigModule` global: pasa a leer el `.env` al arrancar |
| `api-f/src/main.ts` | El puerto ahora sale de la variable `PORT` vía `ConfigService` (default 3000) |
| `api-f/src/infrastructure/data-source.provider.ts` | La fábrica ahora lee `DATA_SOURCE`; cualquier valor no implementado cae en `MockProvider` |
| `api-f/src/infrastructure/data-source.provider.spec.ts` (nuevo) | Test unitario de la fábrica: verifica que siempre entregue un proveedor válido |
| `api-f/.env.example` (nuevo) | Documenta las variables disponibles (`PORT`, `DATA_SOURCE`, `MONGODB_URI`) |

Verificación ejecutada: `pnpm lint` ✅ · `pnpm test` (3 tests) ✅ · `pnpm build` ✅ · arranque real y `HTTP 200` en `http://localhost:3000/` ✅.

### Paso 2 — Documentación · commit `docs` (siguiente)

| Archivo | Motivo del cambio |
|---|---|
| `GUIA-ESTUDIO.md` (nuevo, este archivo) | Guía de estudio en lenguaje accesible |
| `AGENTS.md` (modificado) | Se actualiza para que refleje el estado real: ahora sí existe carga de `.env` y la fábrica lee `DATA_SOURCE` |

## 8. Cómo correrlo y verificarlo

Desde `api-f/`:

```bash
pnpm install        # primera vez
pnpm start:dev      # arranca en http://localhost:3000 (no requiere .env ni credenciales)
pnpm lint           # oxlint (NO es eslint)
pnpm test           # tests unitarios (vitest, NO jest)
pnpm test:e2e       # tests end-to-end (config de vitest separada)
pnpm build          # compila a dist/
```

Test de un solo archivo: `pnpm vitest run src/infrastructure/data-source.provider.spec.ts`.

## 9. Qué NO existe todavía (README ≠ realidad)

El README es la meta a largo plazo. Hoy **no** hay: MongoDB/Mongoose, autenticación JWT, colas (BullMQ/Redis), scraping, `Dockerfile`, ni los `scripts/` de seed e índices que menciona el README. Cualquier paso del README que dependa de esos elementos no aplica todavía.

La ventaja: **el proyecto corre de cero, sin credenciales y sin servicios externos**. Eso es intencional (modo mock) y debe seguir funcionando así en cada cambio.
