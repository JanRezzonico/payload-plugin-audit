import type { Field } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateCreatedByField = (config: AuditPluginPayloadConfig): Field => ({
  name: `${config.pluginPrefix}-created-by`,
  type: 'relationship',
  access: {
    create: () => false,
    read: config.canAccessAudits,
    update: () => false,
  },
  admin: {
    allowCreate: false,
    allowEdit: false,
    appearance: 'drawer',
    condition: (data) => Boolean(data?.id), // Hide on create ops
    readOnly: true,
  },
  hooks: {
    afterRead: [
      async ({ collection, data, req }) => {
        if (!data?.id || !collection) {
          return undefined
        }
        const { docs } = await req.payload.find({
          collection: config.logsCollectionSlug,
          depth: 0,
          limit: 1,
          pagination: false,
          req,
          sort: 'createdAt',
          where: {
            and: [
              { operation: { equals: 'create' } },
              { 'entity.relationTo': { equals: collection.slug } },
              { 'entity.value': { equals: data.id } },
            ],
          },
        })
        return docs[0]?.userId
      },
    ],
  },
  label: 'Created By',
  relationTo: config.userCollection,
  virtual: true,
})

export { generateCreatedByField }
