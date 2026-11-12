import type { IncomingUserCollections, UserCollections } from './types.js'

const normalizeUserCollections = (userCollections: IncomingUserCollections): UserCollections => {
  if (Array.isArray(userCollections)) {
    return userCollections
  }

  return [userCollections]
}

export { normalizeUserCollections }
