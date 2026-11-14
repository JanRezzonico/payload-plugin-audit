import type { CollectionConfig } from 'payload'
import type { PluginConfig } from 'src/config/types.js'

const generateLogsCollection = (config: PluginConfig): CollectionConfig => {
  return {
    slug: config.db.collections.logs.slug,
    access: {
      create: () => false,
      delete: config.access.delete,
      read: config.access.read,
      update: () => false,
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
          create: () => false,
          update: () => false,
        },
        admin: {
          readOnly: true,
        },
        options: ['create', 'update'],
        required: true,
      },
      {
        name: 'entity',
        type: 'relationship',
        access: {
          create: () => false,
          update: () => false,
        },
        admin: {
          components: {
            Description: {
              clientProps: {
                labels: config.ui.fields.entity.description,
              },
              path: 'audit-plugin-payload/client#PolymorphicDescription',
            },
          },
          readOnly: true,
        },
        index: true,
        relationTo: config.collections, // Polymorphic
        required: true,
      },
      {
        name: 'userId',
        type: 'relationship',
        access: {
          create: () => false,
          update: () => false,
        },
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
          readOnly: true,
        },
      },
      {
        name: 'delta',
        type: 'json',
        access: {
          create: () => false,
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
