# AGENTS.md

## Repo layout

- The real app is in `api-f/` (NestJS 12 + TypeScript). **Run every pnpm command from `api-f/`.**
- Root `package.json` is a stub (no scripts, no deps) and root `pnpm-lock.yaml` is not a workspace — there is no monorepo tooling. Don't run `pnpm install` or scripts at the root expecting anything to happen.
- Active branch is `develop` (`main` is the remote default). Commits are prefixed with the ticket id, e.g. `HUU-002: <description>`.

## The README is aspirational — trust the code

`README.md` describes a target architecture that does not exist yet. As of now there is **no** MongoDB/Mongoose, no JWT/auth, no BullMQ/Redis, no scraping, no `.env.example`, no `Dockerfile`, no `scripts/`, and no `config/` directory. Actual state:

- Modules: `src/modules/matches` and `src/modules/predictions` only, backed by in-memory mock data in `src/infrastructure/mock/mock-data.ts`.
- Prediction engine: `src/ml/poisson.service.ts`, called by `src/modules/predictions/predictions.service.ts`.
- The only env var read anywhere is `PORT` (`src/main.ts`, defaults to 3000). There is no env loading and no setup step — `pnpm start:dev` works from a clean clone.
- Tests are **vitest**, lint is **oxlint** — the README's `jest`/`eslint` mentions are wrong.

## Commands (verified, run from `api-f/`)

```bash
pnpm install
pnpm start:dev        # nest start --watch, port 3000
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

## Lint config (`.oxlintrc.json`)

- `typescript/no-explicit-any`: off; `typescript/no-floating-promises`: **error**. Awaiting async calls in controllers/services is mandatory.

## Working agreement

- No CI workflows and no pre-commit hooks exist — nothing runs automatically; verify manually with the commands above.
- Keep the mock-data path working: features should run without external services unless the task is explicitly about adding real infra.
- Don't add setup steps to the README or code that require credentials/DB unless asked; the credential-free mock mode is intentional.
