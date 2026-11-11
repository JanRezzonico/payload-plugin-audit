import type { Config } from 'payload'

import type { IncomingAuditPluginPayloadConfig } from './config/index.js'

import { isPluginEnabled, preparePluginConfig } from './config/index.js'
import { generateCreatedByField } from './libs/fields/created-by/index.js'
import { generateUpdateDeltaField } from './libs/fields/update-delta/index.js'
import { generateCreatedByHook } from './libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from './libs/hooks/update-delta/index.js'

export const auditPluginPayload =
  (incomingPluginConfig: IncomingAuditPluginPayloadConfig) =>
  (config: Config): Config => {
    if (!isPluginEnabled(incomingPluginConfig)) {
      return config
    }
    const pluginConfig = preparePluginConfig(incomingPluginConfig)
    const createdByField = generateCreatedByField(pluginConfig)
    const updateDeltaField = generateUpdateDeltaField(pluginConfig)
    const createdByHook = generateCreatedByHook(pluginConfig)
    const updateDeltaHook = generateUpdateDeltaHook(pluginConfig)

    config.collections?.forEach((collection) => {
      if (!pluginConfig.enabledCollections.includes(collection.slug)) {
        return
      }

      collection.fields = collection.fields ?? []
      collection.hooks = collection.hooks ?? {}
      collection.hooks.beforeChange = collection.hooks.beforeChange ?? []
      collection.fields.push(createdByField)
      collection.hooks.beforeChange.push(createdByHook)
      collection.fields.push(updateDeltaField)
      collection.hooks.beforeChange.push(updateDeltaHook)
    })

    // if (!config.collections) {
    //   config.collections = []
    // }

    // config.collections.push({
    //   slug: 'plugin-collection',
    //   fields: [
    //     {
    //       name: 'id',
    //       type: 'text',
    //     },
    //   ],
    // })

    // if (pluginOptions.collections) {
    //   for (const collectionSlug in pluginOptions.collections) {
    //     const collection = config.collections.find(
    //       (collection) => collection.slug === collectionSlug,
    //     )

    //     if (collection) {
    //       collection.fields.push({
    //         name: 'addedByPlugin',
    //         type: 'text',
    //         admin: {
    //           position: 'sidebar',
    //         },
    //       })
    //     }
    //   }
    // }

    // /**
    //  * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
    //  * If your plugin heavily modifies the database schema, you may want to remove this property.
    //  */
    // if (pluginOptions.disabled) {
    //   return config
    // }

    // if (!config.endpoints) {
    //   config.endpoints = []
    // }

    // if (!config.admin) {
    //   config.admin = {}
    // }

    // if (!config.admin.components) {
    //   config.admin.components = {}
    // }

    // if (!config.admin.components.beforeDashboard) {
    //   config.admin.components.beforeDashboard = []
    // }

    // config.admin.components.beforeDashboard.push(
    //   `audit-plugin-payload/client#BeforeDashboardClient`,
    // )
    // config.admin.components.beforeDashboard.push(`audit-plugin-payload/rsc#BeforeDashboardServer`)

    // config.endpoints.push({
    //   handler: customEndpointHandler,
    //   method: 'get',
    //   path: '/my-plugin-endpoint',
    // })

    // const incomingOnInit = config.onInit

    // config.onInit = async (payload) => {
    //   // Ensure we are executing any existing onInit functions before running our own.
    //   if (incomingOnInit) {
    //     await incomingOnInit(payload)
    //   }

    //   const { totalDocs } = await payload.count({
    //     collection: 'plugin-collection',
    //     where: {
    //       id: {
    //         equals: 'seeded-by-plugin',
    //       },
    //     },
    //   })

    //   if (totalDocs === 0) {
    //     await payload.create({
    //       collection: 'plugin-collection',
    //       data: {
    //         id: 'seeded-by-plugin',
    //       },
    //     })
    //   }
    // }

    return config
  }
