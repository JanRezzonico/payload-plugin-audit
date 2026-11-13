import { defaultDeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import { defaultUpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.types.js'
import { defaultUserDescriptionLabels } from 'src/components/UserDescription.types.js'

import type { ConfigCustom } from './types.js'

const defaultCustom: ConfigCustom = {
  createdBy: {
    label: 'Created By',
  },
  deltaViewerLabels: defaultDeltaViewerLabels,
  updateDelta: {
    date: {
      displayFormat: 'dd/MM/yyyy HH:mm:ss',
      label: 'Date',
    },
    delta: {
      label: 'Delta',
    },
    label: 'Changes',
    labels: {
      plural: 'Changes',
      singular: 'Change',
    },
    rowLabels: defaultUpdateDeltaRowLabelLabels,
    user: {
      label: 'User',
    },
  },
  userDescriptionLabels: defaultUserDescriptionLabels,
} satisfies ConfigCustom

export { defaultCustom }
