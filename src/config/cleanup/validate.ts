import { Cron } from 'croner'
import { deepMergeWithSourceArrays } from 'payload/shared'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { AuditPluginValidationError } from '../../utils/AuditPluginValidationError.js'
import { cleanupDefaults } from './defaults.js'

const isValidCron = (expression: string): boolean => {
  if (!expression) {
    return false
  }
  try {
    new Cron(expression, { paused: true }).stop()
    return true
  } catch {
    return false
  }
}

const validateCleanup = (
  incomingConfig: IncomingPluginConfig['cleanup'],
): PluginConfig['cleanup'] => {
  const merged: PluginConfig['cleanup'] = deepMergeWithSourceArrays(
    cleanupDefaults,
    incomingConfig ?? {},
  )

  merged.queue = merged.queue.trim()

  if (merged.queue.length === 0) {
    throw new AuditPluginValidationError('cleanup.queue must not be empty.')
  }

  if (!Number.isInteger(merged.olderThanDays) || merged.olderThanDays <= 0) {
    throw new AuditPluginValidationError('cleanup.olderThanDays must be a positive integer.')
  }

  if (!isValidCron(merged.schedule)) {
    throw new AuditPluginValidationError('cleanup.schedule is not a valid cron expression.')
  }

  return merged
}

export { validateCleanup }
