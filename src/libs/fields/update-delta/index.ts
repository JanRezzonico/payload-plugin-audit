import type { Field } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateUpdateDeltaField = (config: AuditPluginPayloadConfig): Field => ({
  name: `${config.pluginPrefix}-update-delta`,
  type: 'array',
  access: {
    create: () => false,
    read: config.canAccessAudits,
    update: () => false,
  },
  admin: {
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
      label: config.customizeFields.updateDelta.user.label,
      relationTo: config.userCollection,
      required: false,
    },
    {
      name: 'date',
      type: 'date',
      admin: {
        date: {
          displayFormat: config.customizeFields.updateDelta.date.displayFormat,
        },
      },
      label: config.customizeFields.updateDelta.date.label,
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
      label: config.customizeFields.updateDelta.delta.label,
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
          sort: 'createdAt', // use '-createdAt' for newest first
          where: {
            and: [
              { operation: { equals: 'update' } },
              { 'entity.relationTo': { equals: collection.slug } },
              { 'entity.value': { equals: data.id } },
            ],
          },
        })
        return docs.map((audit) => ({
          id: audit.id, // array rows need an id for the admin UI
          date: audit.createdAt,
          delta: audit.delta,
          user: audit.userId,
        }))
      },
    ],
  },
  label: config.customizeFields.updateDelta.label,
  labels: {
    plural: config.customizeFields.updateDelta.labels.plural,
    singular: config.customizeFields.updateDelta.labels.singular,
  },
  required: false,
  virtual: true,
})

export { generateUpdateDeltaField }
