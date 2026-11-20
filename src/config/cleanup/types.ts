type ConfigCleanupAutoRun = {
  /**
   * Cron expression defining how often the
   * queue should be checked for cleanup tasks.
   *
   */
  cron: string
  /**
   * Whether or not the auto-run feature is enabled.
   * Can be useful to be disabled for serverless environments.
   */
  enabled: boolean
  /**
   * The maximum number of cleanup tasks to run per queue check.
   */
  limit: number
}

type ConfigCleanup = {
  autoRun: ConfigCleanupAutoRun
  /**
   * Whether or not the cleanup feature is enabled.
   */
  enabled: boolean
  /**
   * The number of days after which audit logs should be considered for cleanup.
   */
  olderThanDays: number
  /**
   * The name of the queue to which cleanup tasks should be added.
   */
  queue: string
  /**
   * Cron expression defining when the cleanup tasks should be scheduled.
   */
  schedule: string
}

export type { ConfigCleanup, ConfigCleanupAutoRun }
