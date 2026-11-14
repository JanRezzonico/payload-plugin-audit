import type { CollectionSlug } from 'payload'

/**
 * List of collection slugs that are considered user collections.
 *
 * Include all collections that are auth-enabled and could interact
 * with a collection that is being audited.
 */
type ConfigUserCollections = CollectionSlug[]

export type { ConfigUserCollections }
