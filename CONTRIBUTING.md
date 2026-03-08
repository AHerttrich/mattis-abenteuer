# Contributing to Mattis Abenteuer

Thank you for your interest in contributing! 🏰

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Git**

## Setup

```bash
git clone https://github.com/AHerttrich/mattis-abenteuer.git
cd mattis-abenteuer
make setup
```

This installs dependencies and sets up pre-commit hooks.

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/MA-XXX-description
   ```

2. **Write code** following our conventions (see below)

3. **Test your changes**:
   ```bash
   make test      # Run tests with coverage
   make lint      # Check code style
   make ci        # Full CI check (lint + test + build)
   ```

4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(world): add biome generation
   fix(combat): correct armor damage reduction
   docs(spec): update crafting recipe format
   chore(deps): bump three.js version
   test(castle): add spawner unit tests
   ```

5. **Push and create a PR** to `main`

## Code Conventions

- **TypeScript strict mode** — no `any` types
- **ESLint + Prettier** — auto-format on save
- **Naming**: `camelCase` vars, `PascalCase` types, `UPPER_SNAKE` constants
- **Tests**: co-located in `src/__tests__/`, named `*.test.ts`
- **Coverage target**: > 80%

## Architecture

See [docs/ARCH.md](docs/ARCH.md) for architecture guidance, including:
- ECS (Entity-Component-System) pattern
- Chunk-based world design
- Event-driven communication

## Development Process

See [docs/SDLC.md](docs/SDLC.md) for our full development lifecycle, including:
- Git branching strategy
- CI/CD pipeline
- Testing standards
- Release process

## Getting Help

- Open an issue for bugs or feature requests
- Use the issue templates provided
- For security issues, see [SECURITY.md](SECURITY.md)
