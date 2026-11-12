'use client'
import { useFormFields, useRowLabel } from '@payloadcms/ui'

export type UpdateDeltaRowLabelLabels = {
  /**
   * Template for a change row. `{number}` is replaced with the change number.
   */
  changeNumber: string
  /**
   * Fallback when the row number is undefined.
   */
  genericChange: string
  /**
   * Label for the latest change row.
   */
  latestChange: string
}

export const defaultUpdateDeltaRowLabelLabels: UpdateDeltaRowLabelLabels = {
  changeNumber: 'Change {number}',
  genericChange: 'Change',
  latestChange: 'Latest Change',
}

const fill = (template: string, number: number) => {
  return template.replaceAll('{number}', String(number))
}

const UpdateDeltaRowLabel = ({ labels }: { labels: UpdateDeltaRowLabelLabels }) => {
  const { path, rowNumber } = useRowLabel()
  const arrayPath = path.split('.').slice(0, -1).join('.')
  const total = useFormFields(([fields]) => fields[arrayPath]?.rows?.length ?? 0)

  if (rowNumber === undefined) {
    return <span>{labels.genericChange}</span>
  }
  if (rowNumber === 0) {
    return <span>{fill(labels.latestChange, total)}</span>
  }

  return <span>{fill(labels.changeNumber, total - rowNumber)}</span>
}

export { UpdateDeltaRowLabel }
