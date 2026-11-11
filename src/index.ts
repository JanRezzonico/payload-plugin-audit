import type { Config } from 'payload'

import type { IncomingAuditPluginPayloadConfig } from './config/index.js'

import { isPluginEnabled, preparePluginConfig } from './config/index.js'
import { generateLogsCollection } from './libs/collections/logs/index.js'
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

    config.collections = config.collections ?? []
    config.collections.push(logsCollection)

    config.collections.forEach((collection) => {
      if (collection.slug === pluginConfig.logsCollectionSlug) {
        return // Probably not needed, but just in case, we don't want to add hooks to the logs collection itself
      }
      if (!pluginConfig.enabledCollections.includes(collection.slug)) {
        return
      }

      collection.hooks = collection.hooks ?? {}
      collection.hooks.afterChange = [
        ...(collection.hooks.afterChange ?? []),
        createdByHook,
        updateDeltaHook,
      ]
    })

    return config
  }
