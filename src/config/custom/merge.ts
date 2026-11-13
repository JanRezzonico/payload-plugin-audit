import type { ConfigCustom, OptionalConfigCustom } from './types.js'

import { defaultCustom } from './defaults.js'

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
  return merge(defaultCustom, options) as ConfigCustom
}
