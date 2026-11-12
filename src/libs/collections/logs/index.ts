import type { CollectionConfig } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/types.js'

const generateLogsCollection = (config: AuditPluginPayloadConfig): CollectionConfig => {
  return {
    slug: config.slugs.logsCollection,
    access: {
      create: config.canManageAudits,
      delete: config.canManageAudits,
      read: config.canSeeAudits,
      update: config.canManageAudits,
    },
    admin: {
      defaultColumns: ['operation', 'entity', 'userId', 'createdAt'],
      hidden: config.logsCollectionHidden,
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
        relationTo: config.userCollections,
        required: true,
      },
      {
        name: 'delta',
        type: 'json',
        admin: {
          components: {
            Field: {
              clientProps: {
                labels: config.customizeFields.deltaViewerLabels,
              },
              path: 'audit-plugin-payload/client#DeltaViewer',
            },
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
