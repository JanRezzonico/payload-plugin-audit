import type { Field } from 'payload'
import type { PluginConfig } from 'src/config/types.js'

const generateCreatedByVirtualField = (config: PluginConfig): Field => ({
  name: config.db.fields.createdBy.name,
  type: 'relationship',
  access: {
    create: () => false, // No create of virtual field allowed
    read: config.access.read,
    update: () => false, // No update of virtual field allowed
  },
  admin: {
    allowCreate: false,
    allowEdit: false,
    appearance: 'drawer',
    components: {
      Description: {
        clientProps: {
          labels: config.ui.fields.user.description,
        },
        path: 'audit-plugin-payload/client#PolymorphicDescription',
      },
    },
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
          collection: config.db.collections.logs.slug,
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
  label: config.ui.fields.createdBy.label,
  relationTo: config.userCollections,
  virtual: true,
})

export { generateCreatedByVirtualField }
