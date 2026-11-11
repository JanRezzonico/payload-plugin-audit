import type { CollectionAfterChangeHook } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/types.js'

const generateCreatedByHook = (config: AuditPluginPayloadConfig): CollectionAfterChangeHook => {
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
      collection: config.slugs.logsCollection,
      context,
      data: {
        delta: null, // No delta for create operations
        entity: { relationTo: collection.slug, value: doc.id },
        operation: 'create',
        userId: user.id,
      },
      overrideAccess: true,
      req,
    })

    return
  }
}

export { generateCreatedByHook }
