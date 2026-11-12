import { defaultDeltaViewerLabels } from 'src/components/DeltaViewer.types.js'
import { defaultUpdateDeltaRowLabelLabels } from 'src/components/UpdateDeltaRowLabel.js'

import type { ConfigCustomizeFields } from './types.js'

const defaultCustomizeFields = {
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
} satisfies ConfigCustomizeFields

export { defaultCustomizeFields }
