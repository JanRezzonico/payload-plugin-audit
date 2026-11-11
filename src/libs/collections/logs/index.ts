import type { CollectionConfig } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateLogsCollection = (config: AuditPluginPayloadConfig): CollectionConfig => {
  return {
    slug: config.logsCollectionSlug,
    access: {
      // TODO: consider if create, delete and update should just be false,
      // to avoid admins (or whoever) from rewriting history or crafting fake logs
      create: () => false,
      delete: config.canAccessAudits,
      read: config.canAccessAudits,
      update: () => false,
    },
    admin: {
      hidden: false, // TODO: ask reverse of canAccessAudits, as it is not
      // strictly a boolean so it cannot just be negated

      defaultColumns: ['operation', 'entity', 'userId', 'createdAt'],
    },
    fields: [
      {
        name: 'operation',
        type: 'select',
        options: ['create', 'update'],
        required: true,
      },
      {
        name: 'entity',
        type: 'relationship',
        index: true,
        // Polymorphic relationship to all enabled collections
        relationTo: config.enabledCollections,
        required: true,
      },
      {
        name: 'userId',
        type: 'relationship',
        relationTo: config.userCollection,
        required: true,
      },
      {
        name: 'delta',
        type: 'json',
        admin: {
          components: {
            Field: 'audit-plugin-payload/client#DeltaViewer',
          },
        },
        required: false, // No delta for create operations
      },
    ],
    // Automatic Payload-managed timestamps for createdAt and updatedAt
    timestamps: true,
  }
}

export { generateLogsCollection }
