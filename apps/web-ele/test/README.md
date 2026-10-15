# Tests

All future tests for `web-ele` belong in this directory. The previous unit tests and browser scripts have been removed.

- `unit/<feature>/`: unit tests (`*.test.ts`).
- `e2e/<feature>/`: browser regression tests.
- Keep test fixtures and test-only helpers here as well, not under `src`.

Run future unit tests from the repository root with `pnpm exec vitest run apps/web-ele/test/unit`.
