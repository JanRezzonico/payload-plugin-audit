import type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig } from './types.js'

import { mergeCustomizeFields } from './customize-fields/index.js'

const isPluginEnabled = (config: IncomingAuditPluginPayloadConfig): boolean => {
  if (config.disabled) {
    return false
  }

  if (config.enabledCollections.length === 0) {
    return false
  }

  return true
}

const preparePluginConfig = (
  config: IncomingAuditPluginPayloadConfig,
): AuditPluginPayloadConfig => {
  if (!isPluginEnabled(config)) {
    throw new Error('Invalid audit plugin configuration')
  }
  const customizeFields = mergeCustomizeFields(config.customizeFields)
  const pluginPrefix = 'audit-plugin'
  const logsCollectionHidden =
    config.logsCollectionHidden === undefined ? false : config.logsCollectionHidden

  return {
    ...config,
    customizeFields,
    disabled: false,
    logsCollectionHidden,
    logsCollectionSlug: `${pluginPrefix}-logs` as const,
    pluginPrefix,
  }
}

export { isPluginEnabled, preparePluginConfig }
