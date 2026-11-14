import type { IncomingPluginConfig, PluginConfig } from '../types.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateAccess = (access: IncomingPluginConfig['access']): PluginConfig['access'] => {
  return access
}

export { validateAccess }
