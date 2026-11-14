import { AuditPluginValidationError } from 'src/utils/AuditPluginValidationError.js'

import type { IncomingPluginConfig, PluginConfig } from './types.js'

import { validateAccess } from './access/validate.js'
import { validateCollections } from './collections/validate.js'
import { validateDb } from './db/validate.js'
import { stateDefault } from './state/defaults.js'
import { validateUi } from './ui/validate.js'
import { validateUserCollections } from './user-collections/validate.js'

const isPluginDisabled = (config: IncomingPluginConfig): boolean => {
  const state = config.state ?? stateDefault
  return state === 'disabled'
}

/**
 * Merges the incoming plugin config with the default values.
 *
 * @throws `AuditPluginValidationError` if the incoming config is invalid or if the plugin is disabled
 */
const mergeConfig = (incomingConfig: IncomingPluginConfig): PluginConfig => {
  if (isPluginDisabled(incomingConfig)) {
    throw new AuditPluginValidationError('Audit plugin is disabled but the config is being merged')
  }
  const access = validateAccess(incomingConfig.access)
  const collections = validateCollections(incomingConfig.collections)
  const db = validateDb(incomingConfig.db)
  const ui = validateUi(incomingConfig.ui)
  const userCollections = validateUserCollections(incomingConfig.userCollections)
  const state = incomingConfig.state ?? stateDefault

  return {
    access,
    collections,
    db,
    state,
    ui,
    userCollections,
  }
}

export { isPluginDisabled, mergeConfig }
