import type { CollectionConfig } from 'payload'

/**
 * Configuration for the collections and fields used by the audit plugin in the database.
 *
 * This configuration allows you to customize the names of the collections and fields used by the audit plugin.
 *
 * Note that modifying these fields could warrant a database migration, as these configurations are
 * used to create the collections and fields in the database.
 */
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
