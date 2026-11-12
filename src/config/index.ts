import type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig } from './types.js'

import { mergeCustomizeFields } from './customize-fields/merge.js'
import { normalizeUserCollections } from './user-collections/index.js'

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
  const logsCollectionHidden =
    config.logsCollectionHidden === undefined ? false : config.logsCollectionHidden
  const userCollections = normalizeUserCollections(config.userCollections)

  const pluginPrefix = 'audit-plugin'

  return {
    ...config,
    customizeFields,
    disabled: false,
    logsCollectionHidden,
    slugs: {
      createdByVirtualField: `${pluginPrefix}-created-by` as const,
      logsCollection: `${pluginPrefix}-logs` as const,
      pluginPrefix,
      updateDeltaVirtualField: `${pluginPrefix}-update-delta` as const,
    },
    userCollections,
  }
}

export { isPluginEnabled, preparePluginConfig }
