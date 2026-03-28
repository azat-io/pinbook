# Pinbook Skill

Agent skill for working with [Pinbook](https://github.com/azat-io/pinbook) maps.

## Installation

```bash
npx skills add azat-io/pinbook
```

## What's Included

The Pinbook skill helps coding agents:

- create valid `index.yaml` files
- split large maps into root `index.yaml` plus imported city/category files
- follow Pinbook's stable YAML shape
- pick valid color and icon ids
- understand Pinbook's geocoding and build behavior
- generate map configs that are ready for Google My Maps import

## Example Prompts

```text
Create a Pinbook map for a first week in Tokyo with layers for sights, food, and stay.

Add three coffee stops in Kyoto to this Pinbook map and keep the YAML valid.

Review this index.yaml and fix invalid colors, icons, and missing required fields.

Split this Japan trip into a root config plus imported city files, keeping layers for categories.
```
