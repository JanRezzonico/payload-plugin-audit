import type { ConfigCleanup } from './types.js'

const cleanupDefaults: ConfigCleanup = {
  autoRun: {
    cron: '* * * * *',
    enabled: true,
    limit: 10,
  },
  enabled: true,
  olderThanDays: 90,
  queue: 'payload-plugin-audit',
  schedule: '0 0 * * *',
}

export { cleanupDefaults }
