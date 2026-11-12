import type { DeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import type { UpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.js'

type LabelOnly = { label: string }

type ConfigCustomizeFields = {
  createdBy: LabelOnly
  deltaViewerLabels: DeltaViewerLabels
  updateDelta: {
    date: { displayFormat: string; label: string }
    delta: LabelOnly
    label: string
    labels: { plural: string; singular: string }
    rowLabels: UpdateDeltaRowLabelLabels
    user: LabelOnly
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type OptionalConfigCustomizeFields = DeepPartial<ConfigCustomizeFields> | undefined

export type { ConfigCustomizeFields, OptionalConfigCustomizeFields }
