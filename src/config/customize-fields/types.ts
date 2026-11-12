import type { DeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import type { UpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.js'

type CreatedBy = {
  label: string
}

type UpdateDeltaUser = {
  label: string
}

type UpdateDeltaDate = {
  displayFormat: string
  label: string
}

type UpdateDeltaDelta = {
  label: string
}

type UpdateDeltaLabels = {
  plural: string
  singular: string
}

type UpdateDelta = {
  date: UpdateDeltaDate
  delta: UpdateDeltaDelta
  label: string
  labels: UpdateDeltaLabels
  rowLabels: UpdateDeltaRowLabelLabels
  user: UpdateDeltaUser
}

type ConfigCustomizeFields = {
  createdBy: CreatedBy
  deltaViewerLabels: DeltaViewerLabels
  updateDelta: UpdateDelta
}

type OptionalConfigCustomizeFields =
  | Partial<{
      createdBy: Partial<CreatedBy>
      deltaViewerLabels: Partial<DeltaViewerLabels>
      updateDelta: Partial<{
        date: Partial<UpdateDeltaDate>
        delta: Partial<UpdateDeltaDelta>
        label: string
        labels: Partial<UpdateDeltaLabels>
        rowLabels: Partial<UpdateDeltaRowLabelLabels>
        user: Partial<UpdateDeltaUser>
      }>
    }>
  | undefined

export type { ConfigCustomizeFields, OptionalConfigCustomizeFields }
