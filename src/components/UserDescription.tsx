'use client'

import { useConfig, useFormFields } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

import type { UserDescriptionLabels } from './UserDescription.types.js'

const UserDescription = ({ labels, path }: { labels: UserDescriptionLabels; path: string }) => {
  const { config } = useConfig()
  const value = useFormFields(([fields]) => fields[path]?.value)
  const isObject = value && typeof value === 'object' && !Array.isArray(value)
  if (!isObject) {
    return null
  }
  const isRelationToAvailable = 'relationTo' in value && typeof value.relationTo === 'string'
  const isValueAvailable = 'value' in value && ['number', 'string'].includes(typeof value.value)
  if (!isRelationToAvailable || !isValueAvailable) {
    return null
  }

  const collectionSlug = value.relationTo as string
  const userId = value.value as string
  const collectionHref = formatAdminURL({
    adminRoute: config.routes.admin,
    path: `/collections/${collectionSlug}`,
  })
  const userHref = formatAdminURL({
    adminRoute: config.routes.admin,
    path: `/collections/${collectionSlug}/${userId}`,
  })
  return (
    <div className="field-description">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div>
          <span>{`${labels.userIdPrefix.trim()} `}</span>
          <a href={userHref} rel="noopener noreferrer">
            {userId}
          </a>
        </div>
        <span>|</span>
        <div>
          <span>{`${labels.collectionSlugPrefix.trim()} `}</span>
          <a href={collectionHref} rel="noopener noreferrer">
            {collectionSlug}
          </a>
        </div>
      </div>
    </div>
  )
}

export { UserDescription }
