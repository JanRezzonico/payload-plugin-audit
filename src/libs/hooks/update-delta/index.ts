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

    const original = structuredClone(previousDoc) as Record<string, unknown>
    const nextData = structuredClone(doc) as Record<string, unknown>

    const excluded = [
      'id',
      'createdAt',
      'updatedAt',
      config.db.fields.createdBy.name,
      config.db.fields.updateLogs.name,

      // Avoid join fields, which are computed on read, to be part of the diff
      // if they want to be tracked, they should be tracked in the original collection,
      // where they are a "relationship" field, and not in the collection where they are a "join" field
      ...(collection.flattenedFields ?? []).filter((f) => f.type === 'join').map((f) => f.name),
    ]

    for (const key of excluded) {
      delete original[key]
      delete nextData[key]
    }

    const delta = jsondiffpatch.diff(original, nextData)

    if (!delta) {
      // If there is no delta diff, it means that there are no changes to log,
      // so we don't create one at all
      return
    }

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
