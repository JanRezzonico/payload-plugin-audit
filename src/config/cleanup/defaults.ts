import type { ConfigCleanup } from './types.js'

const cleanupDefaults: ConfigCleanup = {
  olderThanDays: 90,
  schedule: '* 0 0 * * *',
}

export { cleanupDefaults }
