---
description: Run full CI locally — typecheck, lint, test with coverage
---
// turbo-all

1. Run TypeScript type-checking:
   ```
   npx tsc --noEmit
   ```

2. Run ESLint:
   ```
   npm run lint
   ```

3. Run all tests with coverage:
   ```
   npx vitest run --coverage
   ```

4. Report results: type errors, lint issues, test pass/fail count, and coverage percentage.
