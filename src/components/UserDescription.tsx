'use client'

import type { PluginConfig } from 'src/config/types.js'

import { useConfig, useFormFields } from '@payloadcms/ui'

import { unknownToData } from './UserDescription.utils.js'

const UserDescription = ({
  labels,
  path,
}: {
  labels: PluginConfig['ui']['fields']['user']['description']
  path: string
}) => {
  const { config } = useConfig()
  const value = useFormFields(([fields]) => fields[path]?.value)
  const data = unknownToData(value, config)
  if (!data) {
    return null
  }
  return (
    <div className="field-description">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div>
          <span>{labels.beforeUserId}</span>
          <a href={data.userHref} rel="noopener noreferrer">
            {data.userId}
          </a>
        </div>
        <span>{labels.separator}</span>
        <div>
          <span>{labels.beforeCollection}</span>
          <a href={data.collectionHref} rel="noopener noreferrer">
            {data.collectionSlug}
          </a>
        </div>
      </div>
    </div>
  )
}

export { UserDescription }
