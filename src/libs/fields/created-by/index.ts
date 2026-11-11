import type { Field } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateCreatedByField = (config: AuditPluginPayloadConfig): Field => {
  return {
    name: config.createdByName,
    type: 'relationship',
    access: {
      create: config.canAccessAudits,
      read: config.canAccessAudits,
      update: config.canAccessAudits,
    },
    admin: {
      allowEdit: false,
      readOnly: true,
    },
    label: config.customizeFields.createdBy.label,
    relationTo: config.userCollection,
    required: false,
  }
}

export { generateCreatedByField }
