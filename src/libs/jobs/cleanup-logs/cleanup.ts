import type { BasePayload, PayloadRequest } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

type Args = {
  collectionSlug: PluginConfig['db']['collections']['logs']['slug']
  olderThanDays: PluginConfig['cleanup']['olderThanDays']
  payload: BasePayload
  req?: PayloadRequest
}

const cleanupLogs = async ({ collectionSlug, olderThanDays, payload, req }: Args) => {
  const cutoff = new Date(Date.now() - olderThanDays * MS_PER_DAY)
  await payload.db.deleteMany({
    collection: collectionSlug,
    req,
    where: {
      and: [
        { operation: { equals: 'update' } },
        { createdAt: { less_than: cutoff.toISOString() } },
      ],
    },
  })
}

export { cleanupLogs }
