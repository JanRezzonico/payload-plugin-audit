import type { CollectionBeforeChangeHook } from 'payload'
import type { AuditPluginPayloadConfig } from 'src/config/index.js'

import * as jsondiffpatch from 'jsondiffpatch'

const generateUpdateDeltaHook = (config: AuditPluginPayloadConfig): CollectionBeforeChangeHook => {
  return ({ collection, data, operation, originalDoc, req }) => {
    // Skip non-update ops
    if (operation !== 'update') {
      return data
    }

    const hasField = collection.fields.some(
      (field) => 'name' in field && field.name === config.updateDeltaName,
    )
    if (!hasField) {
      // This should never happen, as the field is added earlier by the plugin
      // TODO: Log a warning/error
      return data
    }

    const { user } = req
    if (!user) {
      // This should never happen, as the hook is only called on update ops,
      // and the user should always be present for those
      return data
    }

    // Exclude the id and updateDelta fields from the diff,
    // as they are not relevant to the delta
    const original = structuredClone(originalDoc) as Record<string, unknown>
    const nextData = structuredClone(data) as Record<string, unknown>
    delete original.id
    delete original[config.updateDeltaName]
    delete nextData.id
    delete nextData[config.updateDeltaName]
    const delta = jsondiffpatch.diff(original, nextData)

    if (!delta) {
      // No changes detected, so no need to add a delta record
      return data
    }

    const record = {
      date: new Date().toISOString(),
      delta,
      user: user.id,
    }

    const existingRecords = originalDoc[config.updateDeltaName] || []

    return {
      ...data,
      [config.updateDeltaName]: [...existingRecords, record],
    }
  }
}

export { generateUpdateDeltaHook }
