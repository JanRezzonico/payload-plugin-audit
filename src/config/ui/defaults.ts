import type { ConfigUi } from './types.js'

const uiDefaults: ConfigUi = {
  fields: {
    createdBy: {
      label: 'Created By',
    },
    delta: {
      component: {
        badgeLabels: {
          added: 'Added',
          moved: 'Moved',
          removed: 'Removed',
          updated: 'Updated',
        },
      },
      rows: {
        labels: {
          change: 'Change {number}',
          fallback: 'Change',
          latestChange: 'Latest Change',
        },
      },
    },
    entity: {
      description: {
        beforeCollection: 'Collection:',
        beforeId: 'Entity id:',
        separator: '|',
      },
    },
    updateLogs: {
      date: {
        displayFormat: 'dd/MM/yyyy HH:mm:ss',
        label: 'Date',
      },
      label: 'Changes',
    },
    user: {
      description: {
        beforeCollection: 'Collection:',
        beforeId: 'User id:',
        separator: '|',
      },
      label: 'User',
    },
  },
}

export { uiDefaults }
