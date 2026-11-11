import type { Field } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/types.js'

const generateUpdateDeltaField = (config: AuditPluginPayloadConfig): Field => {
  const ui = config.customizeFields.updateDelta
  return {
    name: `${config.pluginPrefix}-update-delta`,
    type: 'array',
    access: {
      create: () => false, // No create of virtual field allowed
      read: config.canSeeAudits,
      update: () => false, // No update of virtual field allowed
    },
    admin: {
      // Hide on create ops and when there are no update deltas for the entity
      // (when the entity has never been updated)
      components: {
        RowLabel: 'audit-plugin-payload/client#UpdateDeltaRowLabel',
      },
      condition: (data) => {
        const rows = data?.[config.pluginPrefix + '-update-delta']
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
        },
        label: ui.user.label,
        relationTo: config.userCollection,
        required: false,
      },
      {
        name: 'date',
        type: 'date',
        admin: {
          date: {
            displayFormat: ui.date.displayFormat,
          },
        },
        label: ui.date.label,
        required: false,
      },
      {
        name: 'delta',
        type: 'json',
        admin: {
          components: {
            Field: 'audit-plugin-payload/client#DeltaViewer',
          },
        },
        label: ui.delta.label,
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
            collection: config.logsCollectionSlug,
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
            user: audit.userId,
          }))
        },
      ],
    },
    label: ui.label,
    labels: {
      plural: ui.labels.plural,
      singular: ui.labels.singular,
    },
    required: false,
    virtual: true,
  }
}

export { generateUpdateDeltaField }
