import type { ConfigCleanup } from './types.js'

const cleanupDefaults: ConfigCleanup = {
  enabled: false,
  olderThanDays: 90,
  queue: 'payload-plugin-audit',
  schedule: '0 0 * * *',
}

export { cleanupDefaults }
