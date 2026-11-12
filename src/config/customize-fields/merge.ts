import type { ConfigCustomizeFields, OptionalConfigCustomizeFields } from './types.js'

import { defaultCustomizeFields } from './defaults.js'

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

export const mergeCustomizeFields = (
  options?: OptionalConfigCustomizeFields,
): ConfigCustomizeFields => {
  return merge(defaultCustomizeFields, options) as ConfigCustomizeFields
}
