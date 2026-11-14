'use client'

import type { EntityDescriptionProps } from 'src/config/ui/types.js'

import { useConfig, useFormFields } from '@payloadcms/ui'

import { buildCollectionHref, buildEntityHref, formFieldValueToTypedObject } from './utils.js'

const PolymorphicDescription = ({
  labels,
  path,
}: {
  labels: EntityDescriptionProps
  path: string
}) => {
  const { config } = useConfig()
  const value = useFormFields(([fields]) => fields[path]?.value)
  const data = formFieldValueToTypedObject(value)
  if (!data) {
    return null
  }
  const { id, slug } = data
  const collectionHref = buildCollectionHref(slug, config)
  const userHref = buildEntityHref(slug, id, config)

  return (
    <div className="field-description">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div>
          <span>{labels.beforeId}</span>
          <a href={userHref} rel="noopener noreferrer">
            {id}
          </a>
        </div>
        <span>{labels.separator}</span>
        <div>
          <span>{labels.beforeCollection}</span>
          <a href={collectionHref} rel="noopener noreferrer">
            {slug}
          </a>
        </div>
      </div>
    </div>
  )
}

export { PolymorphicDescription }
