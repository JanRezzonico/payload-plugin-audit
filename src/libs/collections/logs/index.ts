import type { CollectionConfig } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/types.js'

const generateLogsCollection = (config: AuditPluginPayloadConfig): CollectionConfig => {
  return {
    slug: config.custom.auditLogCollectionSlug,
    access: {
      create: config.access.manage,
      delete: config.access.manage,
      read: config.access.read,
      update: config.access.manage,
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
        relationTo: config.collections,
        required: true,
      },
      {
        name: 'userId',
        type: 'relationship',
        relationTo: config.userCollections,
        required: true,

        admin: {
          components: {
            Description: {
              clientProps: {
                labels: config.custom.userDescriptionLabels,
              },
              path: 'audit-plugin-payload/client#UserDescription',
            },
          },
        },
      },
      {
        name: 'delta',
        type: 'json',
        admin: {
          components: {
            Field: {
              clientProps: {
                labels: config.custom.deltaViewerLabels,
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
