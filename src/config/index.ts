import { AuditPluginValidationError } from 'src/utils/AuditPluginValidationError.js'

import type { IncomingPluginConfig, PluginConfig } from './types.js'

import { validateAccess } from './access/validate.js'
import { validateCollections } from './collections/validate.js'
import { validateDb } from './db/validate.js'
import { validateUi } from './ui/validate.js'
import { validateUserCollections } from './user-collections/validate.js'

const isPluginEnabled = (config: IncomingPluginConfig): boolean => {
  // Only match explicit true disabled value, false or falsy values mean enabled
  return config.disabled !== true
}

/**
 * Merges the incoming plugin config with the default values.
 *
 * @throws `AuditPluginValidationError` if the incoming config is invalid or if the plugin is disabled
 */
const mergeConfig = (incomingConfig: IncomingPluginConfig): PluginConfig => {
  if (!isPluginEnabled(incomingConfig)) {
    throw new AuditPluginValidationError('Audit plugin is disabled but the config is being merged')
  }
  const access = validateAccess(incomingConfig.access)
  const collections = validateCollections(incomingConfig.collections)
  const db = validateDb(incomingConfig.db)
  const disabled = false // If we reach this point, its enabled
  const ui = validateUi(incomingConfig.ui)
  const userCollections = validateUserCollections(incomingConfig.userCollections)

  return {
    access,
    collections,
    db,
    disabled,
    ui,
    userCollections,
  }
}

export { isPluginEnabled, mergeConfig }
