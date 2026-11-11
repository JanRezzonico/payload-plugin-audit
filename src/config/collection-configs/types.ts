import type { CollectionSlug } from 'payload'

type CollectionConfig = {
  createdByEnabled: boolean
  updateDeltaEnabled: boolean
  // TODO: omitFields and other useful configs
}

type CollectionConfigs = Partial<Record<CollectionSlug, CollectionConfig>>

export type { CollectionConfig, CollectionConfigs }
