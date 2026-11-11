import type { CollectionBeforeChangeHook } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

const generateCreatedByHook = (config: AuditPluginPayloadConfig): CollectionBeforeChangeHook => {
  return ({ collection, data, operation, req }) => {
    // Skip non-create ops
    if (operation !== 'create') {
      return data
    }

    const hasField = collection.fields.some(
      (field) => 'name' in field && field.name === config.createdByName,
    )
    if (!hasField) {
      // This should never happen, as the field is added earlier by the plugin
      // TODO: Log a warning/error
      return data
    }

    const { user } = req
    if (!user) {
      // This should never happen, as the hook is only called on create ops,
      // and the user should always be present for those
      return data
    }

    data[config.createdByName] = user.id
    return data
  }
}

export { generateCreatedByHook }
