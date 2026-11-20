import { deepMergeWithSourceArrays } from 'payload'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { AuditPluginValidationError } from '../../utils/AuditPluginValidationError.js'
import { cleanupDefaults } from './defaults.js'

const validateCleanup = (
  incomingConfig: IncomingPluginConfig['cleanup'],
): PluginConfig['cleanup'] => {
  const merged: PluginConfig['cleanup'] = deepMergeWithSourceArrays(
    cleanupDefaults,
    incomingConfig ?? {},
  )

  if (!Number.isInteger(merged.olderThanDays) || merged.olderThanDays <= 0) {
    throw new AuditPluginValidationError('Cleanup olderThanDays must be a positive integer.')
  }

  return merged
}

export { validateCleanup }
