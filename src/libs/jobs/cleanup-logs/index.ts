import type { TaskConfig } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

const cleanupLogsTaskSlug = 'payload-plugin-audit-cleanup-logs'

const generateCleanupLogsTask = (config: PluginConfig): TaskConfig => {
  return {
    slug: cleanupLogsTaskSlug,
    handler: async ({ req }) => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - config.cleanup.olderThanDays)

      await req.payload.db.deleteMany({
        collection: config.db.collections.logs.slug,
        req,
        where: {
          and: [
            { operation: { equals: 'update' } },
            { createdAt: { less_than: cutoff.toISOString() } },
          ],
        },
      })

      return { output: {} }
    },
    schedule: [{ cron: config.cleanup.schedule, queue: 'default' }],
  }
}

export { cleanupLogsTaskSlug, generateCleanupLogsTask }
