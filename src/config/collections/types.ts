import type { CollectionSlug } from 'payload'

/**
 * Payload configuration for the collections that should be audited.
 *
 * This is an array of collection slugs.
 *
 * Specifying an empty array is not allowed. If you don't want to audit any collections, you can disable the plugin instead.
 *
 * The audit logs collection itself can never be audited and is automatically excluded from this configuration.
 *
 * @example ['posts', 'media']
 */
type ConfigCollections = Array<CollectionSlug>

export type { ConfigCollections }
