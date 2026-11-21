import type { BasePayload, DeleteManyArgs, PayloadRequest } from 'payload'

import type { PluginConfig } from '../../../config/types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

type Args = {
  collectionSlug: PluginConfig['db']['collections']['logs']['slug']
  olderThanDays: PluginConfig['cleanup']['olderThanDays']
  payload: BasePayload
  req?: PayloadRequest
  silent?: PluginConfig['cleanup']['silent']
}

const cleanupLogs = async ({
  collectionSlug,
  olderThanDays,
  payload,
  req,
  silent = false,
}: Args) => {
  const logger = silent ? { info: () => {} } : (payload.logger ?? console ?? { info: () => {} })
  const logPrefix = `[payload-plugin-audit]`

  logger.info(
    `${logPrefix} cleanupLogs function invoked for collection "${collectionSlug}" with olderThanDays=${olderThanDays}`,
  )
  const cutoff = new Date(Date.now() - olderThanDays * MS_PER_DAY)
  logger.info(
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

  logger.info(`${logPrefix} Found ${totalDocs} logs to delete.`)

  if (totalDocs === 0) {
    logger.info(`${logPrefix} No logs to delete. Exiting early.`)
    return
  }

  await payload.db.deleteMany(query)

  logger.info(`${logPrefix} Deleted ${totalDocs} logs.`)
}

export { cleanupLogs }
