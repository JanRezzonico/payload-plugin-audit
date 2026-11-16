import type { CollectionAfterChangeHook } from 'payload'

import * as jsondiffpatch from 'jsondiffpatch'

import type { PluginConfig } from '../../../config/types.js'

const generateUpdateDeltaHook = (config: PluginConfig): CollectionAfterChangeHook => {
  return async ({ collection, context, doc, operation, previousDoc, req }) => {
    // Skip non-update ops
    if (operation !== 'update') {
      return
    }

    const { user } = req
    if (!user) {
      // This should never happen, as the hook is only called on update ops,
      // and the user should always be present for those
      return
    }

    // Exclude the id and timestamps from the delta, as they are not relevant to the update delta
    const original = structuredClone(previousDoc) as Record<string, unknown>
    const nextData = structuredClone(doc) as Record<string, unknown>
    delete original.id
    delete nextData.id
    delete original.createdAt
    delete nextData.createdAt
    delete original.updatedAt
    delete nextData.updatedAt

    // Exclude the plugin's own fields from the delta
    delete original[config.db.fields.createdBy.name]
    delete nextData[config.db.fields.createdBy.name]
    delete original[config.db.fields.updateLogs.name]
    delete nextData[config.db.fields.updateLogs.name]
    const delta = jsondiffpatch.diff(original, nextData)

    await req.payload.create({
      collection: config.db.collections.logs.slug,
      context,
      data: {
        delta,
        entity: { relationTo: collection.slug, value: doc.id },
        operation: 'update',
        user: { relationTo: user.collection, value: user.id },
      },
      overrideAccess: true,
      req,
    })

    return doc
  }
}

export { generateUpdateDeltaHook }
