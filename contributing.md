# Contributing

Thank you for your interest in contributing to Pinbook.

Pinbook is a YAML-first CLI for building Google My Maps-ready KML. This document
explains how to contribute changes safely and keep the project consistent.

## How to Contribute

### Reporting Issues

Before opening a new issue, check existing issues to avoid duplicates.

When reporting a bug, include:

1. A clear title
2. A short description of the problem
3. Steps to reproduce
4. Expected behavior
5. Actual behavior
6. Relevant environment details such as Node.js version and OS

### Suggesting Features

Feature requests are welcome.

Please include:

1. The user problem you want to solve
2. Why the current behavior is not enough
3. A concrete example or workflow
4. Any tradeoffs or implementation concerns you already see

## Pull Requests

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/pinbook.git
   cd pinbook
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Create a Branch**

   ```bash
   git checkout -b feature/your-change
   ```

4. **Make Changes**
   - Follow existing code and docs style
   - Add or update tests when behavior changes
   - Keep user-facing docs in sync when the CLI, schema, or output changes

5. **Run Checks**

   ```bash
   pnpm build
   pnpm test
   ```

   During iteration, you can run focused checks:

   ```bash
   pnpm test:unit
   pnpm test:js
   pnpm test:types
   pnpm test:format
   pnpm test:spelling
   pnpm test:usage
   pnpm test:packages
   ```

6. **Smoke Test the CLI**

   Build first, then run the CLI from `bin/`:

   ```bash
   pnpm build
   node bin/pinbook.js --help
   node bin/pinbook.js build example
   ```

   If you want to test address geocoding without relying on the checked-in
   example cache, set `GOOGLE_MAPS_API_KEY` in your environment or a local
   `.env` file.

7. **Commit Changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Commit messages should follow
   [Conventional Commits](https://www.conventionalcommits.org/).

8. **Push and Open a PR**

   ```bash
   git push origin feature/your-change
   ```

## Development Setup

### Prerequisites

- Node.js `^18.0.0 || >=20.0.0`
- `pnpm`
- Git

### Project Structure

```text
pinbook/
├── bin/          # CLI launcher
├── cli/          # CLI argument handling and entrypoint
├── commands/     # High-level create/build commands
├── config/       # Config loading, validation, and .env helpers
├── resolvers/    # Address resolution and cache handling
├── schema/       # Zod schemas for map config and cache data
├── serializers/  # KML generation
├── skills/       # Local AI skill scaffold and references
├── example/      # Example Pinbook project and generated artifacts
├── test/         # Vitest test suite
└── types/        # Shared TypeScript types
```

### Available Scripts

```bash
# Build
pnpm build

# Full check suite
pnpm test

# Focused checks
pnpm test:unit
pnpm test:js
pnpm test:types
pnpm test:format
pnpm test:spelling
pnpm test:usage
pnpm test:packages

# Docs generation
pnpm docs
pnpm docs:colors
pnpm docs:icons
```

## Project-Specific Guidelines

- Keep `readme.md`, `skills/index.md`, and `example/` aligned with actual
  product behavior.
- If you change color or icon reference data, regenerate the reference docs.
- Do not commit real API keys or secrets. Use placeholders such as the one in
  `example/.env.example`.
- Add or update JSDoc for public APIs when their behavior changes.
- Prefer small, focused changes over large mixed refactors.

## Release Process

Releases are handled by maintainers.

If you are preparing a release locally:

```bash
pnpm release
```

That flow runs checks, updates the changelog, bumps the version, creates a git
commit, and tags the release.
