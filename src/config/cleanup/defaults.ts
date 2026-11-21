import type { ConfigCleanup } from './types.js'

const DEFAULT_QUEUE = 'payload-plugin-audit'

const cleanupDefaults: ConfigCleanup = {
  enabled: false,
  olderThanDays: 90,
  queue: DEFAULT_QUEUE,
  schedule: '0 0 * * *',
  silent: false,
}

export { cleanupDefaults, DEFAULT_QUEUE }
