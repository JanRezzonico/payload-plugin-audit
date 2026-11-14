import type { ClientConfig } from 'payload'

import { formatAdminURL } from 'payload/shared'

const unknownToData = (
  value: unknown,
  config: ClientConfig,
): { collectionHref: string; collectionSlug: string; userHref: string; userId: string } | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const isRelationToAvailable = 'relationTo' in value && typeof value.relationTo === 'string'
  const isValueAvailable = 'value' in value && ['number', 'string'].includes(typeof value.value)

  if (!isRelationToAvailable || !isValueAvailable) {
    return null
  }

  const collectionSlug = value.relationTo as string
  const userId = value.value as string

  return {
    collectionHref: formatAdminURL({
      adminRoute: config.routes.admin,
      path: `/collections/${collectionSlug}`,
    }),
    collectionSlug,
    userHref: formatAdminURL({
      adminRoute: config.routes.admin,
      path: `/collections/${collectionSlug}/${userId}`,
    }),
    userId,
  }
}

export { unknownToData }
