import type { Access, FieldAccess } from 'payload'

type ConfigCanSeeAudits = Access & FieldAccess
type ConfigCanManageAudits = Access & FieldAccess

export type { ConfigCanManageAudits, ConfigCanSeeAudits }
