import type { DeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import type { UpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.types.js'
import type { UserDescriptionLabels } from 'src/components/UserDescription.types.js'

type LabelOnly = { label: string }

type ConfigCustom = {
  auditLogCollectionSlug: string
  createdBy: LabelOnly
  deltaViewerLabels: DeltaViewerLabels
  fieldNames: {
    createdBy: string
    updateDelta: string
  }
  updateDelta: {
    date: { displayFormat: string; label: string }
    delta: LabelOnly
    label: string
    labels: { plural: string; singular: string }
    rowLabels: UpdateDeltaRowLabelLabels
    user: LabelOnly
  }
  userDescriptionLabels: UserDescriptionLabels
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type OptionalConfigCustom = DeepPartial<ConfigCustom> | undefined

export type { ConfigCustom, OptionalConfigCustom }
