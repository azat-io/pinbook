# Pinbook

<img
  src="https://raw.githubusercontent.com/azat-io/pinbook/main/assets/logo.svg"
  alt="Pinbook logo"
  width="160"
  height="160"
  align="right"
/>

[![Version](https://img.shields.io/npm/v/pinbook.svg?color=fff&labelColor=c83636)](https://npmjs.com/package/pinbook)
[![Code Coverage](https://img.shields.io/codecov/c/github/azat-io/pinbook.svg?color=fff&labelColor=c83636)](https://codecov.io/gh/azat-io/pinbook)
[![GitHub License](https://img.shields.io/badge/license-MIT-232428.svg?color=fff&labelColor=c83636)](https://github.com/azat-io/pinbook/blob/main/license.md)

Pinbook is a YAML-first CLI for building Google My Maps-ready KML.

It is designed for travel planning workflows where you want a map format that is
readable by humans, easy to generate with AI, and safe to keep in git.

Plan the trip in plain YAML first, then turn it into a visual map.

## What It Does

- Scaffolds a new map project with `pinbook create`
- Reads an `index.yaml` map config
- Geocodes addresses during build when coordinates are missing
- Writes a `.pinbook/map.kml` file you can import into Google My Maps
- Offers an optional Pinbook skill install for AI agents

## Quick Start

```bash
npx pinbook create my-map
cd my-map
pnpm install
pnpm build
```

Then import `.pinbook/map.kml` into Google My Maps.

Optional AI skill:

```bash
npx skills add azat-io/pinbook
```

## Workflow

1. Create a new project with `pinbook create`.
2. Edit `index.yaml`.
3. Run `pnpm build`.
4. Import `.pinbook/map.kml` into Google My Maps.
5. Repeat as the trip plan changes.

## Multi-File Maps

Pinbook also supports root-level `imports` so one map can be split across
multiple YAML files.

This works well for trips organized by city:

```text
index.yaml
cities/
  tokyo/
    food.yaml
    sights.yaml
  kyoto.yaml
  osaka.yaml
```

Recommended convention:

- use the file structure for geography such as `tokyo`, `kyoto`, and `osaka`
- use `layers` for categories such as `food`, `sights`, and `entertainment`

Example root config:

```yaml
map:
  title: Japan Trip

layers:
  - id: food
    title: Food

  - id: sights
    title: Sights

imports:
  - ./cities/tokyo/*.yaml
  - ./cities/kyoto.yaml
  - ./cities/osaka.yaml

pins: []
```

Imported files may contain only `pins`:

```yaml
pins:
  - id: onibus-coffee-nakameguro
    title: Onibus Coffee Nakameguro
    address: Onibus Coffee Nakameguro, Tokyo
    layer: food
```

## Minimal Example

```yaml
map:
  title: Tokyo First Week
  description: >
    A first-pass map for a week in Tokyo.

layers:
  - id: sights
    title: Sights

pins:
  - id: senso-ji
    title: Senso-ji
    address: Senso-ji Temple, Asakusa, Tokyo
    layer: sights
    color: red-500
    icon: places-viewpoint
    description: >
      Good early-morning stop before the street gets crowded.
    photo: https://example.com/photos/senso-ji.jpg
```

For a canonical example, see [example/index.yaml](./example/index.yaml).

## Config Shape

Pinbook maps use four top-level keys:

- `map` for the map title and optional description
- `layers` for optional logical groups such as `food`, `stay`, or `sights`
- `imports` for optional relative YAML paths or glob patterns
- `pins` for the actual places that should appear on the map

Each pin should describe a real place using either:

- `address` when a clear human-readable address exists
- `coords` when no reliable address is available

Pins can also define `color`, `icon`, `description`, `layer`, and `photo`.

`imports` is root-only. Imported files may contain only `pins`.

## Schema Stability

Pinbook treats the current YAML shape as the public map format.

For the future `1.x` line:

- all current root keys and documented fields are considered stable
- new fields may be added in minor releases
- removing, renaming, or changing the meaning of an existing field requires a
  major release

## Build Behavior

- If a pin includes `coords`, Pinbook uses them as the final coordinates and
  does not geocode the pin.
- If a pin includes `address` and does not include `coords`, Pinbook may call
  the Google Geocoding API during build.
- If a pin includes both `address` and `coords`, `coords` are authoritative and
  are used as the final coordinates.
- If `imports` is present, Pinbook expands the imported YAML files before final
  validation and build.
- Resolved addresses are stored in the local resolution cache so later builds
  stay faster and more repeatable.

## Photos

`photo` is supported as either a single full public `http://` or `https://`
image URL or a list of image URLs.

During build, Pinbook includes those images in the generated placemark
description so they can appear in Google My Maps after import.

Local image paths such as `./photos/senso-ji.jpg` are not supported.

## Geocoding

If a pin has an `address` but no `coords`, Pinbook geocodes the address during
build.

To do that, set `GOOGLE_MAPS_API_KEY` in your environment or in a local `.env`
file inside the map project. In an interactive terminal, Pinbook can also ask
for the key and save it for you.

Resolved addresses are cached locally at
`node_modules/.cache/pinbook/cache.json` so repeated builds stay fast and
stable.

## Compatibility Target

Pinbook targets manual KML import into Google My Maps.

The generated KML is designed around that workflow, including Pinbook's color,
icon, layer, and photo conventions.

## Known Limitations

- Import behavior ultimately depends on Google My Maps.
- Rich import details such as folders, custom icon rendering, photos, and
  description HTML may vary with My Maps behavior.
- Large maps may hit Google My Maps import limits.
- Address-based builds depend on network access to Google Geocoding unless the
  required coordinates are already present in the local cache.
- Imported files may contain only `pins`; nested imports are not supported.

## AI-Assisted Workflow

Pinbook publishes a repo-level skill that can be installed into coding agents
with:

```bash
npx skills add azat-io/pinbook
```

That gives AI agents a reusable Pinbook reference for:

- the expected YAML shape
- supported fields
- color and icon conventions
- a consistent authoring style for map configs

## Current Scope

Pinbook currently focuses on one job: building KML from YAML for Google My Maps.

That means:

- it exports KML for manual import into Google My Maps
- it does not sync directly with Google My Maps
- it is optimized for travel-planning style maps with readable YAML configs

## Contributing

See
[Contributing Guide](https://github.com/azat-io/pinbook/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
