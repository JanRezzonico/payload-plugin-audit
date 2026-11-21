import type { ConfigCleanup } from './types.js'

const cleanupDefaults: ConfigCleanup = {
  enabled: false,
  olderThanDays: 90,
  schedule: '0 0 * * *',
  silent: false,
}

export { cleanupDefaults }
