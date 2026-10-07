# AGENTS.md

## Repo layout

- The real app is in `api-f/` (NestJS 12 + TypeScript). **Run every pnpm command from `api-f/`.**
- Root `package.json` is a stub (no scripts, no deps) and root `pnpm-lock.yaml` is not a workspace — there is no monorepo tooling. Don't run `pnpm install` or scripts at the root expecting anything to happen.
- Active branch is `develop` (`main` is the remote default). Commits are prefixed with the ticket id, e.g. `HUU-002: <description>` (docs-only commits use `docs:`).

## The README is aspirational — trust the code

`README.md` describes a target architecture that does not exist yet. Still **not** implemented: MongoDB/Mongoose, JWT/auth, BullMQ/Redis, scraping, `Dockerfile`, `scripts/`, `config/`. Actual state:

- Modules: `src/modules/matches` and `src/modules/predictions` only, backed by in-memory mock data in `src/infrastructure/mock/mock-data.ts` (`MockProvider`).
- Data source: `src/infrastructure/data-source.provider.ts` exports `MatchDataProviderFactory`, registered **only in `MatchesModule`**. It reads `DATA_SOURCE` and returns `MockProvider` for every value (real providers don't exist yet) — so the credential-free path always works. `matches.service.ts` injects it via `@Inject(MATCH_DATA_PROVIDER)`.
- Prediction engine: `src/ml/poisson.service.ts`, called by `src/modules/predictions/predictions.service.ts`.
- Env: `@nestjs/config` global `ConfigModule` loads `.env`. The **only** vars read in code are `PORT` (`src/main.ts`, default 3000) and `DATA_SOURCE` (provider factory, default `mock`). Everything else in `.env.example`/README (`MONGODB_URI`, `JWT_*`, ...) is documentation, not wired. `.env` is gitignored — never commit it.
- Tests are **vitest**, lint is **oxlint** — the README's `jest`/`eslint` mentions are wrong.

## Commands (verified, run from `api-f/`)

```bash
pnpm install
pnpm start:dev        # nest start --watch, port 3000 (works from a clean clone, no .env needed)
pnpm test             # vitest run  (unit: **/*.spec.ts)
pnpm test:e2e         # vitest run --config ./vitest.config.e2e.ts  (**/*.e2e-spec.ts)
pnpm test:cov         # coverage
pnpm lint             # oxlint --type-aware src/ test/  (NOT eslint)
pnpm format           # prettier --write src/ test/
pnpm build            # nest build -> dist/
```

- Single test file: `pnpm vitest run src/modules/predictions/predictions.service.spec.ts` (or `pnpm vitest run -t "test name"`).
- Unit and e2e use **separate vitest configs**; `pnpm test` will not pick up `*.e2e-spec.ts` files.
- Suggested order before finishing: `pnpm lint && pnpm test` (there is no typecheck script; `pnpm build` or `npx tsc --noEmit` covers types).

## TypeScript/ESM gotchas

- `"type": "module"` with `module: nodenext` — **relative imports must carry the `.js` extension** even in `.ts` sources (`import { AppModule } from './app.module.js';`). An extensionless import compiles fine in some tooling but fails at runtime. Follow the existing pattern.
- Decorators are on (`experimentalDecorators`, `emitDecoratorMetadata`); `strict` is on but `strictPropertyInitialization` is off (NestJS constructor injection style — don't "fix" uninitialized provider fields).
- Vitest globals are enabled (`types: ["vitest/globals"]`) — `describe`/`it`/`expect` need no imports in `*.spec.ts`.
- Path aliases from `tsconfig.json` are resolved in tests by the `vite-tsconfig-paths` plugin (both vitest configs).
- Prettier: single quotes, trailing commas (`.prettierrc`).

## Lint config (`.oxlintrc.json`)

- `typescript/no-explicit-any`: off; `typescript/no-floating-promises`: **error**. Awaiting async calls in controllers/services is mandatory.

## Working agreement

- No CI workflows and no pre-commit hooks exist — nothing runs automatically; verify manually with the commands above.
- Keep the mock-data path working: features should run without external services unless the task is explicitly about adding real infra.
- Don't add setup steps to the README or code that require credentials/DB unless asked; the credential-free mock mode is intentional.
- Other instruction sources: `.atl/skill-registry.md` (skill index) and `odd/tasks/<feature>.md` (active ODD feature docs: verified scope, checks, commit log).
- Git may warn `LF will be replaced by CRLF` on some files (Windows/OneDrive checkout). Don't rewrite line endings repo-wide to "fix" it.
