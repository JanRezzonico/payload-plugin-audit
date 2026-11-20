import type { Config, TaskConfig } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

import { AuditPluginValidationError } from '../../../utils/AuditPluginValidationError.js'

type JobsConfig = NonNullable<Config['jobs']>
type AutoRun = NonNullable<JobsConfig['autoRun']>
type AutoRunEntry = Exclude<AutoRun, (...args: never[]) => unknown>[number]

const TASK_SLUG = 'payload-plugin-audit-cleanup-logs'

const generateCleanupLogsTask = (config: PluginConfig): TaskConfig => {
  const { cleanup, db } = config

  return {
    slug: TASK_SLUG,
    handler: async ({ req }) => {
      const MS_PER_DAY = 24 * 60 * 60 * 1000
      const cutoff = new Date(Date.now() - cleanup.olderThanDays * MS_PER_DAY)

      await req.payload.db.deleteMany({
        collection: db.collections.logs.slug,
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
    retries: 2,
    schedule: [{ cron: cleanup.schedule, queue: cleanup.queue }],
  }
}

const mergeAutoRun = (existing: AutoRun | undefined, entry: AutoRunEntry): AutoRun => {
  if (typeof existing === 'function') {
    return async (payload) => [...(await existing(payload)), entry]
  }

  const list = existing ?? []
  if (list.some((e) => e.queue === entry.queue)) {
    return list
  }
  return [...list, entry]
}

const applyCleanupJobs = (jobs: JobsConfig | undefined, config: PluginConfig): JobsConfig => {
  const { cleanup } = config
  const existingTasks = jobs?.tasks ?? []

  if (existingTasks.some((task) => task.slug === TASK_SLUG)) {
    // Should never happen, unless the host has already added a task with the same slug.
    // This is a safeguard against that. No way around it.
    throw new AuditPluginValidationError(`A task with slug "${TASK_SLUG}" already exists`)
  }

  const next: JobsConfig = {
    ...jobs,
    tasks: [...existingTasks, generateCleanupLogsTask(config)],
  }

  if (cleanup.autoRun.enabled) {
    next.autoRun = mergeAutoRun(jobs?.autoRun, {
      cron: cleanup.autoRun.cron,
      limit: cleanup.autoRun.limit,
      queue: cleanup.queue,
    })
  }

  return next
}

export { applyCleanupJobs, generateCleanupLogsTask }
