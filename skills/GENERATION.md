# Skills Generation Information

This document explains what the Pinbook skill is derived from and how to keep it
synchronized with the product.

## Source of Truth

The Pinbook skill is maintained from these sources:

- [skills/pinbook/SKILL.md](./pinbook/SKILL.md): main agent-facing instructions
- [readme.md](../readme.md): product contract and user-facing behavior
- [example/index.yaml](../example/index.yaml): canonical example map
- [schema/](../schema): public YAML shape and validation rules
- [commands/create.ts](../commands/create.ts): starter project shape
- [commands/build.ts](../commands/build.ts) and [serializers/](../serializers):
  build/output behavior
- [data/colors.ts](../data/colors.ts): source for color reference docs
- [data/icons.ts](../data/icons.ts): source for icon reference docs

## Generated Reference Files

These files are generated from structured data and should not be edited by hand:

- [skills/pinbook/references/colors.md](./pinbook/references/colors.md)
- [skills/pinbook/references/icons/index.md](./pinbook/references/icons/index.md)
- category files under
  [skills/pinbook/references/icons/](./pinbook/references/icons/index.md)

Generation commands:

```bash
pnpm skills:colors
pnpm skills:icons
```

## Manually Maintained Files

These files are hand-written and should be updated deliberately:

- [skills/pinbook/SKILL.md](./pinbook/SKILL.md)
- [skills/pinbook/README.md](./pinbook/README.md)

## When to Update the Skill

Update the skill whenever any of these change:

- public YAML fields or validation rules
- build behavior or geocoding behavior
- supported colors or icons
- canonical example map shape
- product wording in the README that changes the user-facing contract

## Sync Checklist

1. Update the relevant product code or docs.
2. If colors or icons changed, regenerate references:

```bash
pnpm skills:colors
pnpm skills:icons
```

3. Update [skills/pinbook/SKILL.md](./pinbook/SKILL.md) if agent instructions or
   examples changed.
4. Update [skills/pinbook/README.md](./pinbook/README.md) if installation,
   scope, or example prompts changed.
5. Keep [readme.md](../readme.md), [example/index.yaml](../example/index.yaml),
   and the skill aligned.
6. Run checks:

```bash
pnpm test:format
pnpm test:types
pnpm test:unit
```

## Notes for Future Updates

- Prefer incremental updates over rewriting the whole skill.
- Keep the skill concise and task-oriented.
- Do not duplicate large chunks of product docs unless the wording is part of
  the contract agents should follow.
