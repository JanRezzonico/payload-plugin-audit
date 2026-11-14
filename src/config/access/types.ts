import type { Access, FieldAccess } from 'payload'

type AccessRead = Access & FieldAccess

type AccessManage = Access & FieldAccess

type ConfigAccess = {
  /**
   * Payload access control function to determine which
   * users can manually manage the audit logs.
   *
   * This includes creating, updating, and deleting audit logs.
   *
   * This access should be as restrictive as possible, or even set to
   * deny everyone, as an user with this access can create, update, and delete audit logs,
   * which can compromise the integrity of the audit trail.
   *
   * @example ({ req }) => { return false } // Deny everyone
   */
  manage: AccessManage

  /**
   * Payload access control function to determine which
   * users can see the audit logs.
   *
   * @example ({ req }) => { return Boolean(req.user) } // Allow only authenticated users
   */
  read: AccessRead
}

export type { AccessManage, AccessRead, ConfigAccess }
