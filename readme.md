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
- Sets up a local AI skill so agents can help edit the map config

## Quick Start

```bash
npx pinbook create my-map
cd my-map
pnpm install
pnpm build
```

Then import `.pinbook/map.kml` into Google My Maps.

## Workflow

1. Create a new project with `pinbook create`.
2. Edit `index.yaml`.
3. Run `pnpm build`.
4. Import `.pinbook/map.kml` into Google My Maps.
5. Repeat as the trip plan changes.

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

For a full example, see [example/index.yaml](./example/index.yaml).

## Config Shape

Pinbook maps use three top-level keys:

- `map` for the map title and optional description
- `layers` for optional logical groups such as `food`, `stay`, or `sights`
- `pins` for the actual places that should appear on the map

Each pin should describe a real place using either:

- `address` when a clear human-readable address exists
- `coords` when no reliable address is available

Pins can also define `color`, `icon`, `description`, `layer`, and `photo`.

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
- Resolved addresses are stored in the local resolution cache so later builds
  stay faster and more repeatable.

## Photos

`photo` is supported as a full public `http://` or `https://` image URL.

During build, Pinbook includes that image in the generated placemark description
so it can appear in Google My Maps after import.

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

## AI-Assisted Workflow

`pinbook create` also adds a local Pinbook skill under `skills/pinbook/` and
updates `AGENTS.md`.

That gives AI agents a project-local reference for:

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
