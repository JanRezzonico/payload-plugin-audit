import type { Config } from 'payload'

import type { IncomingPluginConfig } from './config/types.js'

import { isPluginDisabled, mergeConfig } from './config/index.js'
import { generateLogsCollection } from './libs/collections/logs/index.js'
import { generateCreatedByVirtualField } from './libs/fields/created-by/index.js'
import { generateUpdateLogsVirtualField } from './libs/fields/update-logs/index.js'
import { generateCreatedByHook } from './libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from './libs/hooks/update-delta/index.js'
import { applyCleanupJobs } from './libs/jobs/cleanup-logs/index.js'
import { AuditPluginValidationError } from './utils/AuditPluginValidationError.js'

export const auditPluginPayload =
  (incomingConfig: IncomingPluginConfig) =>
  (payloadConfig: Config): Config => {
    if (isPluginDisabled(incomingConfig)) {
      return payloadConfig
    }

    const config = mergeConfig(incomingConfig)
    const { cleanup, state } = config
    const collectionSlug = config.db.collections.logs.slug

    const existingCollections = payloadConfig.collections ?? []
    if (existingCollections.some((collection) => collection.slug === collectionSlug)) {
      throw new AuditPluginValidationError(
        `A collection with slug "${collectionSlug}" already exists`,
      )
    }

    const logsCollection = generateLogsCollection(config)
    const createdByVirtualField = generateCreatedByVirtualField(config)
    const updateLogsVirtualField = generateUpdateLogsVirtualField(config)

    const collections = existingCollections.map((collection) => {
      if (!config.collections.includes(collection.slug)) {
        return collection
      }

      return {
        ...collection,
        fields: [...(collection.fields ?? []), createdByVirtualField, updateLogsVirtualField],
        hooks: {
          ...collection.hooks,
          ...(state !== 'inactive' && {
            afterChange: [
              ...(collection.hooks?.afterChange ?? []),
              generateCreatedByHook(config),
              generateUpdateDeltaHook(config),
            ],
          }),
        },
      }
    })

    return {
      ...payloadConfig,
      collections: [...collections, logsCollection],
      ...(cleanup.enabled && { jobs: applyCleanupJobs(payloadConfig.jobs, config) }),
    }
  }

type PayloadPluginAuditConfig = IncomingPluginConfig

export type { PayloadPluginAuditConfig }
