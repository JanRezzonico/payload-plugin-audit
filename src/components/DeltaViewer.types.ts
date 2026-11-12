export type DeltaViewerOpKind = 'added' | 'moved' | 'removed' | 'updated'

export type DeltaViewerLabels = Record<DeltaViewerOpKind, string>

export type DeltaViewerKindLabel = {
  text: string
  variant: DeltaViewerChipVariant
}

export const defaultDeltaViewerLabels: DeltaViewerLabels = {
  added: 'Added',
  moved: 'Moved',
  removed: 'Removed',
  updated: 'Updated',
}

export type DeltaViewerKindLabels = Record<DeltaViewerOpKind, DeltaViewerKindLabel>

export type DeltaViewerChipVariant = 'neutral' | 'new' | 'old' | 'update'
