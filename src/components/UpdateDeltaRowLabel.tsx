'use client'
import { useFormFields, useRowLabel } from '@payloadcms/ui'

const UpdateDeltaRowLabel = () => {
  const { path, rowNumber } = useRowLabel()
  const arrayPath = path.split('.').slice(0, -1).join('.')
  const total = useFormFields(([fields]) => fields[arrayPath]?.rows?.length ?? 0)

  if (rowNumber === undefined) {
    return <span>Change</span>
  }
  if (rowNumber === 0) {
    return <span>Latest change</span>
  }

  return <span>Change {total - rowNumber}</span>
}

export { UpdateDeltaRowLabel }
