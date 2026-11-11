import type { Field } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateUpdateDeltaField = (config: AuditPluginPayloadConfig): Field => {
  return {
    name: config.updateDeltaName,
    type: 'array',
    access: {
      create: config.canAccessAudits,
      read: config.canAccessAudits,
      update: config.canAccessAudits,
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
    label: config.customizeFields.updateDelta.label,
    labels: {
      plural: config.customizeFields.updateDelta.labels.plural,
      singular: config.customizeFields.updateDelta.labels.singular,
    },
    required: false,
  }
}

export { generateUpdateDeltaField }
