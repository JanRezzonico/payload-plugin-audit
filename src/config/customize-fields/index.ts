import { defaultDeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import { defaultUpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.js'

import type { ConfigCustomizeFields, OptionalConfigCustomizeFields } from './types.js'

const defaultValue = {
  createdBy: {
    label: 'Created By',
  },
  deltaViewerLabels: defaultDeltaViewerLabels,
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
    rowLabels: defaultUpdateDeltaRowLabelLabels,
    user: {
      label: 'User',
    },
  },
} satisfies ConfigCustomizeFields

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const merge = (base: PlainObject, override?: PlainObject): PlainObject => {
  const result: PlainObject = { ...base }

  for (const [key, value] of Object.entries(override ?? {})) {
    if (value === undefined) {
      continue
    }

    const current = result[key]
    result[key] = isPlainObject(current) && isPlainObject(value) ? merge(current, value) : value
  }

  return result
}

const mergeCustomizeFields = (options?: OptionalConfigCustomizeFields): ConfigCustomizeFields => {
  return merge(defaultValue, options) as ConfigCustomizeFields
}

export { mergeCustomizeFields }
