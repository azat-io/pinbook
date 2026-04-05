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

## Example

Pinbook can describe a real multi-city trip, not just a tiny demo config.

The canonical example in this repository covers Tokyo, Kyoto, Osaka, Nara, and
Hiroshima as a multi-file travel map:

- Source config: [example/index.yaml](./example/index.yaml)
- Live Google My Maps example:
  [Japan Example Map](https://www.google.com/maps/d/viewer?mid=1am89OiTz6iQ7sreXEYzyjCbvvY6DR9I)

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

# Edit index.yaml and add at least one pin

# Optional: authorize Google Drive uploads
# when `photo` points to local files
# pnpm exec pinbook drive-auth

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

Two common conventions:

- **layers for categories** — group by `food`, `sights`, `entertainment` (shown
  below)
- **layers for geography** — group by city such as `tokyo`, `kyoto`, `osaka`
  (used in the [canonical example](./example/index.yaml))

Both work well. Pick whichever makes the map easier to read at a glance.

Example root config with category-based layers:

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

`photo` is supported as either:

- a single full public `http://` or `https://` image URL
- a single local image path such as `./photos/senso-ji.jpg`
- a list that mixes public URLs and local paths

During build, Pinbook includes those images in the generated placemark
description so they can appear in Google My Maps after import.

When `photo` points to a local file, Pinbook uploads it to Google Drive during
build and rewrites it to a public URL before generating KML.

By default, Pinbook creates or reuses this folder structure in Google Drive:

```text
Pinbook/
  <Map title>/
```

For example, a map with `map.title: Japan Trip` uploads local photos into:

```text
Pinbook/Japan Trip
```

If `GOOGLE_DRIVE_FOLDER_ID` is set, Pinbook uses that folder as the parent and
creates or reuses:

```text
<Configured folder>/<Map title>
```

For imported YAML files, local photo paths are resolved relative to the file
that declared them.

To authorize local photo uploads:

```bash
pnpm exec pinbook drive-auth
```

That flow stores the Google Drive OAuth client ID, client secret, and refresh
token in the local project `.env` file.

## Geocoding

If a pin has an `address` but no `coords`, Pinbook geocodes the address during
build.

To do that, set `GOOGLE_MAPS_API_KEY` in your environment or in a local `.env`
file inside the map project. In an interactive terminal, Pinbook can also ask
for the key and save it for you.

Resolved addresses are cached locally at
`node_modules/.cache/pinbook/cache.json` so repeated builds stay fast and
stable.

## Google Drive Auth

Pinbook uses two separate Google integrations:

- `GOOGLE_MAPS_API_KEY` for address geocoding
- Google Drive OAuth credentials for uploading local photo files

Google Drive uploads do **not** use a Drive API key.

Run `pinbook drive-auth` to save a refresh token locally, or provide these
variables in the local `.env` file:

```bash
GOOGLE_DRIVE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-google-drive-refresh-token
# Optional parent folder. Pinbook will then upload into
# <that folder>/<Map title> instead of Pinbook/<Map title>.
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
```

Uploaded photo metadata is cached locally at
`node_modules/.cache/pinbook/photo-cache.json` so unchanged files are not
uploaded again on every build.

`pinbook drive-auth` stores these values in the local project `.env` file next
to your YAML config and ensures that `.env` is ignored by Git.

## Google Drive Setup

Use this once per Pinbook map project when you want to reference local photo
paths such as `./photos/senso-ji.jpg`.

1. Create or choose a Google Cloud project.
2. Enable the Google Drive API for that project.
3. Open `Google Auth Platform`.
4. Complete the initial app setup in `Branding`. For personal use, a simple app
   name and support email are enough.
5. Open `Audience`. If you are using a personal Google account, choose
   `External`.
6. Decide whether the app should stay in `Testing` or move to `Production`.
   `Testing` is fine for quick experiments, but Google limits it to test users
   and test-user authorizations expire after 7 days. `Production` is better for
   long-lived personal use.
7. Open `Clients` and create an OAuth client with application type
   `Desktop app`.
8. In your Pinbook project, run:

```bash
pnpm exec pinbook drive-auth
```

9. Paste the `Client ID` and `Client Secret`.
10. Open the Google URL printed by Pinbook and finish the sign-in flow.
11. Wait for the terminal message:

```text
Google Drive auth saved to the local .env file.
```

After that, `pnpm build` can upload local photos automatically.

## Google Drive Notes

- `pinbook drive-auth` must run in a local interactive terminal with access to a
  browser. Google explicitly documents desktop OAuth as a local flow.
- Pinbook uses the `https://www.googleapis.com/auth/drive.file` scope. Google
  classifies it as `Recommended / Non-sensitive`.
- The OAuth exchange can take a little while after the browser says
  `Pinbook authorization complete`. The refresh token is not saved until the
  terminal prints the success message.

## Google Drive Troubleshooting

- `access_denied` after sign-in usually means the app is still in `Testing` and
  your Google account was not added as a test user in `Audience`.
- If local photos are uploaded into Drive root, `GOOGLE_DRIVE_FOLDER_ID` is not
  set and the map title folder has not been created yet. Pinbook now creates
  `Pinbook/<Map title>` automatically on the next build.
- If unchanged photos are already in
  `node_modules/.cache/pinbook/photo-cache.json`, Pinbook reuses their public
  URLs and skips re-uploading them.

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
- Local photo uploads depend on Google Drive OAuth and public Drive download
  links.
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
- it can upload local pin photos to Google Drive during build
- it is optimized for travel-planning style maps with readable YAML configs

## Contributing

See
[Contributing Guide](https://github.com/azat-io/pinbook/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
