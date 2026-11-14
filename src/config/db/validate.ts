import { deepMergeWithSourceArrays } from 'payload'
import { AuditPluginValidationError } from 'src/utils/AuditPluginValidationError.js'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { dbDefaults } from './defaults.js'

/**
 * Validates the database configuration.
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateDb = (incomingConfig: IncomingPluginConfig['db']): PluginConfig['db'] => {
  const merged: PluginConfig['db'] = deepMergeWithSourceArrays(dbDefaults, incomingConfig ?? {})
  merged.fields.createdBy.name = merged.fields.createdBy.name.trim()
  merged.fields.updateLogs.name = merged.fields.updateLogs.name.trim()
  merged.collections.logs.slug = merged.collections.logs.slug.trim()

  if (!KEBAB_CASE_REGEX.test(merged.collections.logs.slug)) {
    throw new AuditPluginValidationError(
      `Invalid slug for logs collection: ${merged.collections.logs.slug}. Must be in kebab-case.`,
    )
  }

  if (!LOWER_CAMEL_CASE_REGEX.test(merged.fields.createdBy.name)) {
    throw new AuditPluginValidationError(
      `Invalid name for createdBy field: ${merged.fields.createdBy.name}. Must be in lowerCamelCase.`,
    )
  }

  if (!LOWER_CAMEL_CASE_REGEX.test(merged.fields.updateLogs.name)) {
    throw new AuditPluginValidationError(
      `Invalid name for updateLogs field: ${merged.fields.updateLogs.name}. Must be in lowerCamelCase.`,
    )
  }

  return merged
}

const KEBAB_CASE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOWER_CAMEL_CASE_REGEX = /^[a-z]+(?:[A-Z][a-z0-9]+)*$/

export { validateDb }
