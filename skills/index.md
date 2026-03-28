# Pinbook Skill

Use this guide when creating, editing, or reviewing a Pinbook YAML map config.

## Goal

Produce valid, readable `index.yaml` files that build into KML for Google My
Maps.

Prefer configs that are:

- easy for humans to read
- easy for AI to extend
- valid against the project schema
- ready to build into KML for Google My Maps

## Core Rules

- Always write YAML, not JSON.
- Always use the root keys `map`, `layers`, and `pins`.
- Always include at least one pin.
- Every pin must include `id` and `title`.
- Every pin must include either `address` or `coords`.
- Prefer `address` over `coords` when a clear human-readable address is known.
- Use `coords` only when the user explicitly provides coordinates or the place
  does not have a reliable address.
- If a pin includes both `address` and `coords`, treat `coords` as the
  authoritative final coordinates.
- Use only `color-tone` values such as `red-500` or `deep-purple-800`.
- Never use bare color ids such as `red` or `blue`.
- Use only canonical icon `id` values such as `places-museum` or
  `places-restaurant`.
- Never invent fields that are not defined in the schema.
- If a pin uses `layer`, that value must match an existing layer `id`.

## Stability

- Treat the documented YAML keys and fields as the stable public map format.
- Do not rename or remove existing fields in generated configs.

## Build Behavior

- `pinbook build` reads `index.yaml`.
- If a pin includes `coords`, Pinbook uses them directly and skips geocoding.
- If a pin has `address` but no `coords`, Pinbook geocodes the address during
  build.
- Geocoding uses Google Maps and stores resolved coordinates in the local cache.
- If a pin includes both `address` and `coords`, `coords` win.
- `photo` may be a full `http://` or `https://` image URL or a list of image
  URLs.

## Compatibility Target

- Pinbook targets manual KML import into Google My Maps.
- Import details such as folders, icon rendering, photos, and rich descriptions
  depend on Google My Maps behavior.

## Config Shape

```yaml
map:
  title: Example Map
  description: >
    Optional map-level description.

layers:
  - id: food
    title: Food
    description: Optional layer description.

pins:
  - id: sample-pin
    title: Sample Pin
    address: Example address
    layer: food
    color: red-500
    icon: places-restaurant
    description: >
      Optional pin description.
    photo: https://example.com/photos/sample.jpg
```

## Field Reference

### `map`

Map-level metadata.

- `title`: required string
- `description`: optional string

### `layers`

Optional list of logical groups used to organize pins.

Each layer supports:

- `id`: required string
- `title`: required string
- `description`: optional string

### `pins`

Required list of pins. At least one item is required.

Each pin supports:

- `id`: required string
- `title`: required string
- `address`: optional string
- `coords`: optional `[latitude, longitude]`
- `layer`: optional string
- `color`: optional string, defaults to `red-500`
- `icon`: optional string, defaults to `shapes-pin`
- `description`: optional string
- `photo`: optional full `http://` or `https://` image URL or list of URLs

Pin validation rule:

- a pin must include at least one of `address` or `coords`

## Style Guidance

- Use short, stable ids such as `senso-ji`, `tokyo-station`, `day-trip-nikko`.
- Keep `title` human-readable.
- Use folded YAML strings with `>` for longer descriptions.
- Keep descriptions concise and useful.
- Prefer explicit `color` and `icon` values when the place type is clear.
- Use `layers` only when they improve navigation or grouping.
- If a map is small, `layers: []` is acceptable.

## References

- Colors: [references/colors.md](./references/colors.md)
- Icons index: [references/icons/index.md](./references/icons/index.md)
- Example project: [../example/index.yaml](../example/index.yaml)

Before choosing an icon:

1. Open the most relevant category file from
   [references/icons/index.md](./references/icons/index.md).
2. Pick a named icon that clearly matches the place type.
3. Emit the canonical `id`, not the display name.

## Authoring Workflow

When helping with a Pinbook map:

1. Understand the map purpose.
2. Decide whether layers are useful.
3. Prefer addresses for real-world places.
4. Pick explicit colors from the colors reference.
5. Pick explicit icons from the icons reference.
6. Return valid YAML with no extra fields.

If required details are missing, ask only for the minimum needed information.

## Good Patterns

### Minimal Map

Use this when the map is small and does not need layers.

```yaml
map:
  title: Kyoto Coffee Stops
  description: >
    A short list of reliable coffee stops in Kyoto.

layers: []

pins:
  - id: weekenders-coffee-kyoto
    title: Weekenders Coffee
    address: Weekenders Coffee, Kyoto
    color: brown-600
    icon: places-cafe
    description: >
      Small specialty coffee shop near Nishiki Market.
```

### Layered Travel Map

Use this when the map mixes landmarks, food, and hotels.

```yaml
map:
  title: Tokyo First Week
  description: >
    A balanced first-week Tokyo map with landmarks, food stops, and one hotel.

layers:
  - id: sights
    title: Sights
    description: Major landmarks and viewpoints.

  - id: food
    title: Food
    description: Restaurants, cafes, and snack stops.

  - id: stay
    title: Stay
    description: Hotel and logistics-related pins.

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

  - id: onibus-coffee-nakameguro
    title: Onibus Coffee Nakameguro
    address: Onibus Coffee Nakameguro, Tokyo
    layer: food
    color: teal-600
    icon: places-cafe
    description: >
      Good morning coffee stop before exploring Nakameguro.

  - id: hotel-groove-shinjuku
    title: Hotel Groove Shinjuku
    address: Hotel Groove Shinjuku, Tokyo
    layer: stay
    color: amber-700
    icon: places-hotel
    description: >
      Central base for evening plans in Shinjuku.
```

### Coordinates-Only Pin

Use this only when no reliable address is available.

```yaml
map:
  title: Remote Viewpoints

layers: []

pins:
  - id: ridge-lookout
    title: Ridge Lookout
    coords: [35.3606, 138.7274]
    color: blue-700
    icon: places-viewpoint
    description: >
      Remote overlook without a stable postal address.
```

## Common Mistakes

- Using `red` instead of `red-500`
- Using icon display names such as `Museum` instead of ids such as
  `places-museum`
- Using a local path such as `./photos/image.jpg` instead of a full image URL
- Adding a `layer` value that does not exist in `layers`
- Omitting both `address` and `coords`
- Inventing unsupported fields such as `notes`, `tags`, `category`, or `image`
- Using long paragraphs where a short routing note would be clearer

## Final Checklist

Before finalizing a map config:

- Root keys are exactly `map`, `layers`, `pins`
- At least one pin exists
- Every pin has `id` and `title`
- Every pin has `address` or `coords`
- Every `layer` reference matches an existing layer id
- Every `color` uses the `color-tone` format
- Every `icon` is a canonical icon id
- YAML is readable and consistently formatted
