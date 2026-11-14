import type { CollectionConfig } from 'payload'
import type { PluginConfig } from 'src/config/types.js'

const generateLogsCollection = (config: PluginConfig): CollectionConfig => {
  return {
    slug: config.db.collections.logs.slug,
    access: {
      create: config.access.manage,
      delete: config.access.manage,
      read: config.access.read,
      update: config.access.manage,
    },
    admin: {
      defaultColumns: ['operation', 'entity', 'userId', 'createdAt'],
      hidden: config.db.collections.logs.hidden,
    },
    fields: [
      {
        name: 'operation',
        type: 'select',
        access: {
          // Operation type should never be changed as it could break things
          update: () => false,
        },
        options: ['create', 'update'],
        required: true,
      },
      {
        name: 'entity',
        type: 'relationship',
        admin: {
          components: {
            Description: {
              clientProps: {
                labels: config.ui.fields.entity.description,
              },
              path: 'audit-plugin-payload/client#PolymorphicDescription',
            },
          },
        },
        index: true,
        relationTo: config.collections, // Polymorphic
        required: true,
      },
      {
        name: 'userId',
        type: 'relationship',
        label: config.ui.fields.user.label,
        relationTo: config.userCollections,
        required: true,

        admin: {
          components: {
            Description: {
              clientProps: {
                labels: config.ui.fields.user.description,
              },
              path: 'audit-plugin-payload/client#PolymorphicDescription',
            },
          },
        },
      },
      {
        name: 'delta',
        type: 'json',
        access: {
          // Block delta updates done via API (ui access is already restricted by custom Field and readOnly: true)
          update: () => false,
        },
        admin: {
          components: {
            Field: {
              clientProps: {
                colors: config.ui.fields.delta.component.colors,
                labels: config.ui.fields.delta.component.badgeLabels,
              },
              path: 'audit-plugin-payload/client#DeltaViewer',
            },
          },
          readOnly: true,
        },
        required: false, // No delta for create operations
      },
    ],
    // Automatic Payload-managed timestamps for createdAt and updatedAt
    timestamps: true,
  }
}

export { generateLogsCollection }
