'use client'
import { useFormFields, useRowLabel } from '@payloadcms/ui'

import type { PluginConfig } from '../config/types.js'

const fill = (template: string, number: number) => {
  return template.replaceAll('{number}', String(number))
}

const UpdateDeltaRowLabel = ({
  labels,
}: {
  labels: PluginConfig['ui']['fields']['delta']['rows']['labels']
}) => {
  const { path, rowNumber } = useRowLabel()
  const arrayPath = path.split('.').slice(0, -1).join('.')
  const total = useFormFields(([fields]) => fields[arrayPath]?.rows?.length ?? 0)

  if (rowNumber === undefined) {
    return <span>{labels.fallback}</span>
  }
  if (rowNumber === 0) {
    return <span>{fill(labels.latestChange, total)}</span>
  }

  return <span>{fill(labels.change, total - rowNumber)}</span>
}

export { UpdateDeltaRowLabel }
