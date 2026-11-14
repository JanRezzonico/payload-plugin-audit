import type { Access, FieldAccess } from 'payload'

type AccessRead = Access & FieldAccess
type AccessManage = Access & FieldAccess

type ConfigAccess = {
  manage: AccessManage
  read: AccessRead
}

export type { AccessManage, AccessRead, ConfigAccess }
