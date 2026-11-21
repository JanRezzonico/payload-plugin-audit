import type { BasePayload, DeleteManyArgs, PayloadRequest } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

type Args = {
  collectionSlug: PluginConfig['db']['collections']['logs']['slug']
  olderThanDays: PluginConfig['cleanup']['olderThanDays']
  payload: BasePayload
  req?: PayloadRequest
}

const cleanupLogs = async ({ collectionSlug, olderThanDays, payload, req }: Args) => {
  const logPrefix = `[payload-plugin-audit]`
  payload.logger.info(
    `${logPrefix} cleanupLogs function invoked for collection "${collectionSlug}" with olderThanDays=${olderThanDays}`,
  )
  const cutoff = new Date(Date.now() - olderThanDays * MS_PER_DAY)
  payload.logger.info(
    `${logPrefix} Deleting logs older than ${olderThanDays} days (before ${cutoff.toISOString()})...`,
  )

  const query = {
    collection: collectionSlug,
    req,
    where: {
      and: [
        { operation: { equals: 'update' } },
        { createdAt: { less_than: cutoff.toISOString() } },
      ],
    },
  } as DeleteManyArgs

  const { totalDocs } = await payload.db.count(query)

  payload.logger.info(`${logPrefix} Found ${totalDocs} logs to delete.`)

  if (totalDocs === 0) {
    payload.logger.info(`${logPrefix} No logs to delete. Exiting early.`)
    return
  }

  await payload.db.deleteMany(query)

  payload.logger.info(`${logPrefix} Deleted ${totalDocs} logs.`)
}

export { cleanupLogs }
