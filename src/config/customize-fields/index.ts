import type { ConfigCustomizeFields, OptionalConfigCustomizeFields } from './types.js'

const defaultValue = {
  createdBy: {
    label: 'Created By',
  },
  updateDelta: {
    date: {
      displayFormat: 'dd/MM/yyyy HH:mm:ss',
      label: 'Date',
    },
    delta: {
      label: 'Delta',
    },
    label: 'Changes',
    labels: {
      plural: 'Changes',
      singular: 'Change',
    },
    user: {
      label: 'User',
    },
  },
} satisfies ConfigCustomizeFields

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const mergeInto = (target: PlainObject, source?: PlainObject): PlainObject => {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value === undefined) {
      continue
    }

    const current = target[key]
    target[key] = isPlainObject(current) && isPlainObject(value) ? mergeInto(current, value) : value
  }
  return target
}

const mergeCustomizeFields = (options?: OptionalConfigCustomizeFields): ConfigCustomizeFields => {
  const defaultClone = structuredClone(defaultValue) // Avoid mutating the default value
  return mergeInto(defaultClone, options) as ConfigCustomizeFields
}

export { mergeCustomizeFields }
