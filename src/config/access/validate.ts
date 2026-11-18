import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { accessDefaults } from './defaults.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateAccess = (access: IncomingPluginConfig['access']): PluginConfig['access'] => {
  if (!access) {
    return accessDefaults
  }

  const create = typeof access.create === 'function' ? access.create : accessDefaults.create
  const deleteAccess = typeof access.delete === 'function' ? access.delete : accessDefaults.delete
  const read = typeof access.read === 'function' ? access.read : accessDefaults.read

  return {
    create,
    delete: deleteAccess,
    read,
  } as PluginConfig['access']
}

export { validateAccess }
