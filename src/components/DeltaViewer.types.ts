export type DeltaViewerOpKind = 'added' | 'moved' | 'removed' | 'updated'

export type DeltaViewerLabels = Record<DeltaViewerOpKind, string>

export type DeltaViewerKindLabel = {
  text: string
  variant: DeltaViewerChipVariant
}

export type DeltaViewerKindLabels = Record<DeltaViewerOpKind, DeltaViewerKindLabel>

export type DeltaViewerChipVariant = 'neutral' | 'new' | 'old' | 'update'
