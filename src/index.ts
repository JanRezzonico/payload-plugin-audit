import type { Config } from 'payload'

import type { IncomingAuditPluginPayloadConfig } from './config/types.js'

import { isPluginEnabled, preparePluginConfig } from './config/index.js'
import { generateLogsCollection } from './libs/collections/logs/index.js'
import { generateCreatedByVirtualField } from './libs/fields/created-by/index.js'
import { generateUpdateDeltaVirtualField } from './libs/fields/update-delta/index.js'
import { generateCreatedByHook } from './libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from './libs/hooks/update-delta/index.js'

export const auditPluginPayload =
  (incomingPluginConfig: IncomingAuditPluginPayloadConfig) =>
  (config: Config): Config => {
    if (!isPluginEnabled(incomingPluginConfig)) {
      return config
    }
    const pluginConfig = preparePluginConfig(incomingPluginConfig)

    const createdByHook = generateCreatedByHook(pluginConfig)
    const updateDeltaHook = generateUpdateDeltaHook(pluginConfig)

    const logsCollection = generateLogsCollection(pluginConfig)

    const createdByVirtualField = generateCreatedByVirtualField(pluginConfig)
    const updateDeltaVirtualField = generateUpdateDeltaVirtualField(pluginConfig)

    config.collections = config.collections ?? []
    config.collections.push(logsCollection)

    config.collections.forEach((collection) => {
      if (collection.slug === pluginConfig.custom.auditLogCollectionSlug) {
        return // Probably not needed, but just in case, we don't want to add hooks to the logs collection itself
      }
      if (!pluginConfig.collections.includes(collection.slug)) {
        return
      }

      collection.hooks = collection.hooks ?? {}
      collection.hooks.afterChange = [
        ...(collection.hooks.afterChange ?? []),
        createdByHook,
        updateDeltaHook,
      ]

      collection.fields = collection.fields ?? []
      collection.fields = [...collection.fields, createdByVirtualField, updateDeltaVirtualField]
    })

    return config
  }
