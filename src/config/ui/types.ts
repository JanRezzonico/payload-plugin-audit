type EntityDescriptionProps = {
  beforeCollection: string
  beforeId: string
  separator: string
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
      }
      rows: {
        labels: {
          change: string
          fallback: string
          latestChange: string
        }
      }
    }
    entity: {
      description: EntityDescriptionProps
    }
    updateLogs: {
      date: {
        displayFormat: string
        label: string
      }
      label: string
    }
    user: {
      description: EntityDescriptionProps
      label: string
    }
  }
}
export type { ConfigUi, EntityDescriptionProps }
