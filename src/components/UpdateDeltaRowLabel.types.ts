type UpdateDeltaRowLabelLabels = {
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

const defaultUpdateDeltaRowLabelLabels: UpdateDeltaRowLabelLabels = {
  changeNumber: 'Change {number}',
  genericChange: 'Change',
  latestChange: 'Latest Change',
}

export type { UpdateDeltaRowLabelLabels }
export { defaultUpdateDeltaRowLabelLabels }
