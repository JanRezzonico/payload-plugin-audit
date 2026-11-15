import type { Field } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

const generateUpdateLogsVirtualField = (config: PluginConfig): Field => {
  return {
    name: config.db.fields.updateLogs.name,
    type: 'array',
    access: {
      create: () => false, // No create of virtual field allowed
      read: config.access.read,
      update: () => false, // No update of virtual field allowed
    },
    admin: {
      // Hide on create ops and when there are no update deltas for the entity
      // (when the entity has never been updated)
      components: {
        RowLabel: {
          clientProps: {
            labels: config.ui.fields.delta.rows.labels,
          },
          path: 'payload-plugin-audit/client#UpdateDeltaRowLabel',
        },
      },
      condition: (data) => {
        const rows = data?.[config.db.fields.updateLogs.name]
        return Array.isArray(rows) && rows.length > 0
      },
      initCollapsed: true,
      readOnly: true,
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        admin: {
          allowEdit: false,
          appearance: 'drawer',
          components: {
            Description: {
              clientProps: {
                labels: config.ui.fields.user.description,
              },
              path: 'payload-plugin-audit/client#PolymorphicDescription',
            },
          },
        },
        label: config.ui.fields.user.label,
        relationTo: config.userCollections,
        required: false,
      },
      {
        name: 'date',
        type: 'date',
        admin: {
          date: {
            displayFormat: config.ui.fields.updateLogs.date.displayFormat,
          },
        },
        label: config.ui.fields.updateLogs.date.label,
        required: false,
      },
      {
        name: 'delta',
        type: 'json',
        admin: {
          components: {
            Field: {
              clientProps: {
                colors: config.ui.fields.delta.component.colors,
                labels: config.ui.fields.delta.component.badgeLabels,
              },
              path: 'payload-plugin-audit/client#DeltaViewer',
            },
          },
        },
        required: false,
      },
    ],
    hooks: {
      afterRead: [
        async ({ collection, data, req }) => {
          if (!data?.id || !collection) {
            return undefined
          }
          const { docs } = await req.payload.find({
            collection: config.db.collections.logs.slug,
            depth: 0,
            pagination: false,
            req,
            sort: '-createdAt',
            where: {
              and: [
                { operation: { equals: 'update' } },
                { 'entity.relationTo': { equals: collection.slug } },
                { 'entity.value': { equals: data.id } },
              ],
            },
          })
          return docs.map((audit) => ({
            id: audit.id,
            date: audit.createdAt,
            delta: audit.delta,
            user: audit.user,
          }))
        },
      ],
    },
    label: config.ui.fields.updateLogs.label,
    required: false,
    virtual: true,
  }
}

export { generateUpdateLogsVirtualField }
