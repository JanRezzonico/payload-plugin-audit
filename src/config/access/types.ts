import type { Access, FieldAccess } from 'payload'

/**
 * Payload access control function to determine which
 * users can see the audit logs.
 */
type AccessRead = Access & FieldAccess

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
type AccessManage = Access & FieldAccess

/**
 * Payload access control configuration for the audit plugin.
 * @see {@link AccessRead} for read access control
 * @see {@link AccessManage} for manage access control
 */
type ConfigAccess = {
  manage: AccessManage
  read: AccessRead
}

export type { AccessManage, AccessRead, ConfigAccess }
