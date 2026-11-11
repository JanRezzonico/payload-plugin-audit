import type { Access, CollectionConfig, FieldAccess } from 'payload'

type ConfigCanSeeAudits = Access & FieldAccess
type ConfigCanManageAudits = Access & FieldAccess
type ConfigLogsCollectionHidden = NonNullable<CollectionConfig['admin']>['hidden']

export type { ConfigCanManageAudits, ConfigCanSeeAudits, ConfigLogsCollectionHidden }
