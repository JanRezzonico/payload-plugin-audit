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
    const reservedFieldNames = new Set([
      config.db.fields.createdBy.name,
      config.db.fields.updateLogs.name,
    ])

    const collections = existingCollections.map((collection) => {
      if (!config.collections.includes(collection.slug)) {
        return collection
      }

      if (
        collection.fields?.some((field) => 'name' in field && reservedFieldNames.has(field.name))
      ) {
        throw new AuditPluginValidationError(
          `An audited collection already contains a reserved field name`,
        )
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

export { DEFAULT_QUEUE as AUDIT_PLUGIN_DEFAULT_QUEUE } from './config/cleanup/defaults.js'
export { cleanupLogs as cleanupAuditLogs } from './libs/jobs/cleanup-logs/cleanup.js'
export { TASK_SLUG as AUDIT_CLEANUP_TASK_SLUG } from './libs/jobs/cleanup-logs/index.js'
