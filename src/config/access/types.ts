import type { Access, CollectionConfig, FieldAccess } from 'payload'

type AccessRead = Access & FieldAccess
type AccessManage = Access & FieldAccess
type ConfigLogsCollectionHidden = NonNullable<CollectionConfig['admin']>['hidden']

export type { AccessManage, AccessRead, ConfigLogsCollectionHidden }
