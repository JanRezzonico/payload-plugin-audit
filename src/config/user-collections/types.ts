import type { CollectionSlug } from 'payload'

type IncomingUserCollections = CollectionSlug | CollectionSlug[]

type UserCollections = CollectionSlug[]

export type { IncomingUserCollections, UserCollections }
