type DeltaComponentColors = {
  neutral: {
    background: string
    border: string
    foreground: string
  }
  new: {
    background: string
    border: string
    foreground: string
  }
  old: {
    background: string
    border: string
    foreground: string
  }
  updated: {
    background: string
    border: string
    foreground: string
  }
}

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
        colors: DeltaComponentColors
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
export type { ConfigUi, DeltaComponentColors }
