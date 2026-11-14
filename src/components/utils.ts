import type { ClientConfig } from 'payload'

import { formatAdminURL } from 'payload/shared'

const formFieldValueToTypedObject = (
  value: unknown,
): { id: number | string; slug: string } | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const isRelationToAvailable = 'relationTo' in value && typeof value.relationTo === 'string'
  const isValueAvailable = 'value' in value && ['number', 'string'].includes(typeof value.value)

  if (!isRelationToAvailable || !isValueAvailable) {
    return null
  }

  const slug = value.relationTo as string
  const id = value.value as number | string

  return {
    id,
    slug,
  }
}

const buildCollectionHref = (collectionSlug: string, config: ClientConfig): string => {
  return formatAdminURL({
    adminRoute: config.routes.admin,
    path: `/collections/${collectionSlug}`,
  })
}

const buildEntityHref = (
  collectionSlug: string,
  entityId: number | string,
  config: ClientConfig,
): string => {
  return formatAdminURL({
    adminRoute: config.routes.admin,
    path: `/collections/${collectionSlug}/${entityId}`,
  })
}

export { buildCollectionHref, buildEntityHref, formFieldValueToTypedObject }
