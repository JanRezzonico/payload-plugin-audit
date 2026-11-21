import type { Config, TaskConfig } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

import { AuditPluginValidationError } from '../../../utils/AuditPluginValidationError.js'
import { cleanupLogs } from './cleanup.js'

const TASK_SLUG = 'payload-plugin-audit-cleanup-logs'
const AUDIT_PLUGIN_QUEUE = 'payload-plugin-audit'

const generateCleanupLogsTask = (config: PluginConfig): TaskConfig => {
  const { cleanup, db } = config

  return {
    slug: TASK_SLUG,
    handler: async ({ req }) => {
      await cleanupLogs({
        collectionSlug: db.collections.logs.slug,
        olderThanDays: cleanup.olderThanDays,
        payload: req.payload,
        req,
        silent: cleanup.silent,
      })
      return { output: {} }
    },
    retries: 2,
    schedule: [{ cron: cleanup.schedule, queue: AUDIT_PLUGIN_QUEUE }],
  }
}

type JobsConfig = NonNullable<Config['jobs']>

const applyCleanupJobs = (jobs: JobsConfig | undefined, config: PluginConfig): JobsConfig => {
  const existingTasks = jobs?.tasks ?? []

  if (existingTasks.some((task) => task.slug === TASK_SLUG)) {
    throw new AuditPluginValidationError(`A task with slug "${TASK_SLUG}" already exists`)
  }

  return {
    ...jobs,
    tasks: [...existingTasks, generateCleanupLogsTask(config)],
  }
}

export { applyCleanupJobs, AUDIT_PLUGIN_QUEUE, generateCleanupLogsTask, TASK_SLUG }
