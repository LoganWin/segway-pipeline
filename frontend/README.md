# Frontend

Run from the repository root with Node 22.12+ and pnpm 10.22.0:

```sh
make setup
make dev
make lint
make test
pnpm --dir frontend build
```

The app runs at http://localhost:5173. Start the backend separately on port 8000
until T-001 and T-002's Makefiles are integrated. Vite proxies `/api` to that API.

With the backend running, regenerate the committed contract:

```sh
make types
# equivalent: pnpm --dir frontend gen:api
```

`src/api/schema.ts` is generated from the T-001 backend; do not edit it by hand.
The typed client uses relative URLs; production hosting must serve `/api` on the
same origin and provide an SPA fallback for direct navigation to routes.

Tailwind v4 uses its Vite plugin. shadcn/ui is configured in `components.json`,
with components in `src/components/ui` and the `@/` alias shared by TypeScript,
Vite, and Vitest. Add further components from `frontend/` with
`pnpm dlx shadcn@latest add <component>`.

`pnpm --dir frontend format` formats source files. Generated API types and the
lockfile are excluded from formatting. `test:watch` starts Vitest in watch mode.
