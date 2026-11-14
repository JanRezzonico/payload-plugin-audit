import type { CollectionAfterChangeHook } from 'payload'
import type { PluginConfig } from 'src/config/types.js'

const generateCreatedByHook = (config: PluginConfig): CollectionAfterChangeHook => {
  return async ({ collection, context, doc, operation, req }) => {
    // Skip non-create ops
    if (operation !== 'create') {
      return
    }

    const { user } = req
    if (!user) {
      // This should never happen, as the hook is only called on create ops,
      // and the user should always be present for those
      return
    }
    await req.payload.create({
      collection: config.db.collections.logs.slug,
      context,
      data: {
        delta: null, // No delta for create operations
        entity: { relationTo: collection.slug, value: doc.id },
        operation: 'create',
        user: { relationTo: user.collection, value: user.id },
      },
      overrideAccess: true,
      req,
    })

    return
  }
}

export { generateCreatedByHook }
