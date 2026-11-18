import type { Access, FieldAccess } from 'payload'

type AccessRead = Access & FieldAccess

type AccessDelete = Access & FieldAccess

type AccessCreate = Access & FieldAccess

type ConfigAccess = {
  /**
   * Payload access control function to determine which
   * users can create audit logs.
   *
   * @example ({ req }) => { return false } // Deny everyone
   */
  create: AccessCreate

  /**
   * Payload access control function to determine which
   * users can manually delete audit logs.
   *
   * This access should be restrictive as users with it can remove parts of the audit trail.
   *
   * @example ({ req }) => { return false } // Deny everyone
   */
  delete: AccessDelete

  /**
   * Payload access control function to determine which
   * users can see the audit logs.
   *
   * @example ({ req }) => { return Boolean(req.user) } // Allow only authenticated users
   */
  read: AccessRead
}

export type { AccessDelete, AccessRead, ConfigAccess }
