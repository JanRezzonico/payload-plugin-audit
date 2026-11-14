type ConfigUi = {
  fields: {
    createdBy: {
      label: string
    }
    delta: {
      component: {
        badgeLabels: {
          added: string
          moved: string
          removed: string
          updated: string
        }
      }
      rows: {
        labels: {
          change: string
          fallback: string
          latestChange: string
        }
      }
    }
    updateLogs: {
      date: {
        displayFormat: string
        label: string
      }
      label: string
    }
    user: {
      description: {
        beforeCollection: string
        beforeUserId: string
        separator: string
      }
      label: string
    }
  }
}
export type { ConfigUi }
