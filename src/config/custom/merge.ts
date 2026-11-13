import type { ConfigCustom, OptionalConfigCustom } from './types.js'

import { defaultCustom } from './defaults.js'
import { COLLECTION_SLUG_REGEX, FIELD_NAME_REGEX } from './regex.js'

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const merge = (base: PlainObject, override: PlainObject = {}): PlainObject => {
  const result = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue
    }
    result[key] =
      isPlainObject(result[key]) && isPlainObject(value) ? merge(result[key], value) : value
  }
  return result
}

export const mergeCustom = (options?: OptionalConfigCustom): ConfigCustom => {
  const merged = merge(defaultCustom, options) as ConfigCustom
  if (!merged.auditLogCollectionSlug.match(COLLECTION_SLUG_REGEX)) {
    throw new Error(
      `Invalid auditLogCollectionSlug: ${merged.auditLogCollectionSlug}. It must be kebab-case.`,
    )
  }
  if (!merged.fieldNames.createdBy.match(FIELD_NAME_REGEX)) {
    throw new Error(
      `Invalid fieldNames.createdBy: ${merged.fieldNames.createdBy}. It must be lowerCamelCase.`,
    )
  }
  if (!merged.fieldNames.updateDelta.match(FIELD_NAME_REGEX)) {
    throw new Error(
      `Invalid fieldNames.updateDelta: ${merged.fieldNames.updateDelta}. It must be lowerCamelCase.`,
    )
  }
  return merged
}
