import type { Config } from 'payload'

import type { IncomingPluginConfig } from './config/types.js'

import { isPluginDisabled, mergeConfig } from './config/index.js'
import { generateLogsCollection } from './libs/collections/logs/index.js'
import { generateCreatedByVirtualField } from './libs/fields/created-by/index.js'
import { generateUpdateLogsVirtualField } from './libs/fields/update-logs/index.js'
import { generateCreatedByHook } from './libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from './libs/hooks/update-delta/index.js'
import { generateCleanupLogsTask } from './libs/jobs/cleanup-logs/index.js'

export const auditPluginPayload =
  (incomingConfig: IncomingPluginConfig) =>
  (payloadConfig: Config): Config => {
    if (isPluginDisabled(incomingConfig)) {
      return payloadConfig
    }

    const config = mergeConfig(incomingConfig)
    const { state } = config

    const logsCollection = generateLogsCollection(config)

    const createdByVirtualField = generateCreatedByVirtualField(config)
    const updateLogsVirtualField = generateUpdateLogsVirtualField(config)

    payloadConfig.collections = payloadConfig.collections ?? []
    payloadConfig.collections.push(logsCollection)

    payloadConfig.jobs = payloadConfig.jobs ?? {}
    payloadConfig.jobs.tasks = [
      ...(payloadConfig.jobs.tasks ?? []),
      generateCleanupLogsTask(config),
    ]

    payloadConfig.collections.forEach((collection) => {
      if (collection.slug === config.db.collections.logs.slug) {
        return
      }
      if (!config.collections.includes(collection.slug)) {
        return
      }

      if (state !== 'inactive') {
        const createdByHook = generateCreatedByHook(config)
        const updateDeltaHook = generateUpdateDeltaHook(config)
        collection.hooks = collection.hooks ?? {}
        collection.hooks.afterChange = [
          ...(collection.hooks.afterChange ?? []),
          createdByHook,
          updateDeltaHook,
        ]
      }

      collection.fields = collection.fields ?? []
      collection.fields = [...collection.fields, createdByVirtualField, updateLogsVirtualField]
    })

    return payloadConfig
  }

type PayloadPluginAuditConfig = IncomingPluginConfig

export type { PayloadPluginAuditConfig }
