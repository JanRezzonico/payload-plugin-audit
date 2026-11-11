/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionAfterChangeHook, CollectionConfig, Config } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import { isPluginEnabled, preparePluginConfig } from '../src/config/index.js'
import { auditPluginPayload } from '../src/index.js'

const canManageAudits = ({ req: { user } }: { req: { user?: { role?: string } | null } }) =>
  user?.role === 'admin'

const canSeeAudits = ({ req: { user } }: { req: { user?: { role?: string } | null } }) =>
  user?.role === 'admin' || user?.role === 'editor'

const createConfig = (collections: NonNullable<Config['collections']>): Config => ({
  collections,
  db: {} as Config['db'],
  secret: 'test-secret',
})

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const basePluginConfig = {
  canManageAudits,
  canSeeAudits,
  enabledCollections: ['posts'],
  userCollection: 'users',
}

type HookArgs = Parameters<CollectionAfterChangeHook>[0]
type Doc = Record<string, any>

const findCollection = (config: Config, slug: string) =>
  config.collections?.find((collection) => collection.slug === slug)

const applyPlugin = (
  collections: NonNullable<Config['collections']>,
  overrides: Record<string, unknown> = {},
) => {
  const config = createConfig(collections)
  auditPluginPayload({ ...basePluginConfig, ...overrides } as any)(config)
  return config
}

const getLogCollection = (config: Config) => findCollection(config, 'audit-plugin-logs')

const runAfterChange = async (
  config: Config,
  args: {
    doc?: Doc
    operation: 'create' | 'update'
    previousDoc?: Doc
    slug?: string
    user?: { id: string } | null
  },
) => {
  const collection = findCollection(config, args.slug ?? 'posts')
  const createAuditLog = vi.fn()

  for (const hook of collection?.hooks?.afterChange ?? []) {
    await hook({
      collection,
      context: {},
      doc: args.doc ?? {},
      operation: args.operation,
      previousDoc: args.previousDoc,
      req: {
        payload: { create: createAuditLog },
        user: args.user === undefined ? { id: 'user-1' } : args.user,
      },
    } as unknown as HookArgs)
  }

  return createAuditLog
}

describe('auditPluginPayload config transform', () => {
  test('leaves the config unchanged when the plugin is disabled', () => {
    const config = createConfig([{ slug: 'posts', fields: [] }])

    const result = auditPluginPayload({ ...basePluginConfig, disabled: true })(config)

    expect(result).toBe(config)
    expect(config.collections).toHaveLength(1)
    expect(getLogCollection(config)).toBeUndefined()
  })

  test('adds one external logs collection for enabled collections', () => {
    const posts: CollectionConfig = {
      slug: 'posts',
      fields: [{ name: 'title', type: 'text' }],
    }
    const media: CollectionConfig = { slug: 'media', fields: [] }
    const config = applyPlugin([posts, media])
    const logs = getLogCollection(config)

    expect(config.collections).toHaveLength(3)
    expect(
      findCollection(config, 'posts')?.fields.map((field) => 'name' in field && field.name),
    ).toEqual(['title', 'audit-plugin-created-by', 'audit-plugin-update-delta'])
    expect(findCollection(config, 'media')).toMatchObject({ fields: [] })
    expect(logs).toMatchObject({ slug: 'audit-plugin-logs', timestamps: true })
    expect(logs?.fields.map((field) => 'name' in field && field.name)).toEqual([
      'operation',
      'entity',
      'userId',
      'delta',
    ])
  })

  test('configures log access and relationships', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      enabledCollections: ['posts', 'media'],
    })
    const logs = getLogCollection(config)
    const entity = logs?.fields.find((field) => 'name' in field && field.name === 'entity')
    const userId = logs?.fields.find((field) => 'name' in field && field.name === 'userId')

    expect(logs?.access?.create?.({ req: { user: { role: 'admin' } } } as any)).toBe(true)
    expect(logs?.access?.update?.({ req: { user: { role: 'editor' } } } as any)).toBe(false)
    expect(logs?.access?.read?.({ req: { user: { role: 'admin' } } } as any)).toBe(true)
    expect(logs?.access?.read?.({ req: { user: { role: 'editor' } } } as any)).toBe(true)
    expect(logs?.access?.delete?.({ req: { user: { role: 'editor' } } } as any)).toBe(false)
    expect(entity).toMatchObject({ relationTo: ['posts', 'media'] })
    expect(userId).toMatchObject({ relationTo: 'users' })
  })

  test('configures log collection visibility', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      logsCollectionHidden: true,
    })

    expect(getLogCollection(config)?.admin?.hidden).toBe(true)
  })

  test('does not mutate the options it is given', () => {
    const options = deepFreeze({ ...basePluginConfig })
    const config = createConfig([{ slug: 'posts', fields: [] }])

    expect(() => auditPluginPayload(options as any)(config)).not.toThrow()
    expect(options).toEqual(basePluginConfig)
  })
})

describe('plugin option helpers', () => {
  test('only enables the plugin for active collections', () => {
    expect(isPluginEnabled(basePluginConfig)).toBe(true)
    expect(isPluginEnabled({ ...basePluginConfig, disabled: true })).toBe(false)
    expect(isPluginEnabled({ ...basePluginConfig, enabledCollections: [] })).toBe(false)
  })

  test('prepares stable plugin values and merged customization', () => {
    const prepared = preparePluginConfig({
      ...basePluginConfig,
      customizeFields: { updateDelta: { delta: { label: 'Diff' } } },
    })

    expect(prepared).toMatchObject({
      customizeFields: {
        updateDelta: {
          date: { label: 'Date' },
          delta: { label: 'Diff' },
        },
      },
      disabled: false,
      enabledCollections: ['posts'],
      logsCollectionHidden: false,
      slugs: {
        createdByVirtualField: 'audit-plugin-created-by',
        logsCollection: 'audit-plugin-logs',
        pluginPrefix: 'audit-plugin',
        updateDeltaVirtualField: 'audit-plugin-update-delta',
      },
    })
  })
})

describe('audit log hooks', () => {
  test('writes a create log with the created entity and user', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'Post' },
      operation: 'create',
      user: { id: 'user-1' },
    })

    expect(createAuditLog).toHaveBeenCalledOnce()
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'audit-plugin-logs',
        data: {
          delta: null,
          entity: { relationTo: 'posts', value: 'post-1' },
          operation: 'create',
          userId: 'user-1',
        },
        overrideAccess: true,
      }),
    )
  })

  test('writes an update log containing the document delta', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'After' },
      operation: 'update',
      previousDoc: { id: 'post-1', title: 'Before' },
      user: { id: 'user-2' },
    })

    expect(createAuditLog).toHaveBeenCalledOnce()
    expect(createAuditLog.mock.calls[0]?.[0]).toMatchObject({
      collection: 'audit-plugin-logs',
      data: {
        delta: { title: ['Before', 'After'] },
        entity: { relationTo: 'posts', value: 'post-1' },
        operation: 'update',
        userId: 'user-2',
      },
    })
  })

  test('does not write audit logs without a user', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'Post' },
      operation: 'create',
      user: null,
    })

    expect(createAuditLog).not.toHaveBeenCalled()
  })
})
