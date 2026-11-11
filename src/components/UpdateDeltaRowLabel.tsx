'use client'
import { useFormFields, useRowLabel } from '@payloadcms/ui'

const LABELS = {
  change: 'Change',
  changeNumber: (number: number) => `Change ${number}`,
  latestChange: 'Latest change',
}

const UpdateDeltaRowLabel = () => {
  const { path, rowNumber } = useRowLabel()
  const arrayPath = path.split('.').slice(0, -1).join('.')
  const total = useFormFields(([fields]) => fields[arrayPath]?.rows?.length ?? 0)

  if (rowNumber === undefined) {
    return <span>{LABELS.change}</span>
  }
  if (rowNumber === 0) {
    return <span>{LABELS.latestChange}</span>
  }

  return <span>{LABELS.changeNumber(total - rowNumber)}</span>
}

export { UpdateDeltaRowLabel }
