import type { CollectionConfig } from 'payload'

type ConfigDb = {
  collections: {
    logs: {
      hidden: NonNullable<CollectionConfig['admin']>['hidden']
      slug: string
    }
  }
  fields: {
    createdBy: {
      name: string
    }
    updateLogs: {
      name: string
    }
  }
}
export type { ConfigDb }
