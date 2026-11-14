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
        colors: {
          neutral: {
            background: '#f0f0f0',
            border: '#9ca3af',
            foreground: '#444',
          },
          new: {
            background: '#dcfce7',
            border: '#22c55e',
            foreground: '#166534',
          },
          old: {
            background: '#fee2e2',
            border: '#ef4444',
            foreground: '#991b1b',
          },
          updated: {
            background: '#ffedd5',
            border: '#f59e0b',
            foreground: '#9a3412',
          },
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
