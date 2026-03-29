export {
  LocationResolutionError,
  resolveConfig,
} from '../resolvers/resolve-config'
export type { LocationResolutionIssue } from '../types/location-resolution-issue'
export type { ResolveConfigOptions } from '../types/resolve-config-options'
export type { CoordinatesSchema } from '../schema/coordinates-schema'
export type { ResolvedMapConfig } from '../types/resolved-map-config'
export type { MapConfigSchema } from '../schema/map-config-schema'
export type { KmlExportOptions } from '../serializers/export-kml'
export type { PinColorSchema } from '../schema/pin-color-schema'
export type { PinIconSchema } from '../schema/pin-icon-schema'
export type { ConfigIssue } from '../config/validate-config'
export { validateConfig } from '../config/validate-config'
export type { ResolvedPin } from '../types/resolved-pin'
export type { PinSchema } from '../schema/pin-schema'
export { exportKml } from '../serializers/export-kml'
export { loadConfig } from '../config/load-config'
