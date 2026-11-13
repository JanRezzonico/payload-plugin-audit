/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionAfterChangeHook, CollectionConfig, Config } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import { isPluginEnabled, preparePluginConfig } from '../src/config/index.js'
import { normalizeUserCollections } from '../src/config/user-collections/index.js'
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
  userCollections: 'users',
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
    user?: { collection: string; id: string } | null
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
        user: args.user === undefined ? { id: 'user-1', collection: 'users' } : args.user,
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
    ).toEqual(['title', 'auditPluginCreatedBy', 'auditPluginUpdateDelta'])
    expect(findCollection(config, 'media')).toMatchObject({ fields: [] })
    expect(logs).toMatchObject({ slug: 'audit-plugin-logs', timestamps: true })
    expect(logs?.fields.map((field) => 'name' in field && field.name)).toEqual([
      'operation',
      'entity',
      'userId',
      'delta',
    ])
  })

  test('preserves existing collection hooks and only transforms enabled collections', () => {
    const existingHook = vi.fn()
    const posts: CollectionConfig = {
      slug: 'posts',
      fields: [],
      hooks: { afterChange: [existingHook] },
    }
    const media: CollectionConfig = {
      slug: 'media',
      fields: [],
      hooks: { afterChange: [existingHook] },
    }

    const config = applyPlugin([posts, media])

    expect(findCollection(config, 'posts')?.hooks?.afterChange).toHaveLength(3)
    expect(findCollection(config, 'posts')?.hooks?.afterChange?.[0]).toBe(existingHook)
    expect(findCollection(config, 'media')?.hooks?.afterChange).toEqual([existingHook])
    expect(findCollection(config, 'media')?.fields).toEqual([])
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
    expect(userId).toMatchObject({ relationTo: ['users'] })
  })

  test('configures all audit relationships for multiple user collections', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      userCollections: ['users', 'other-users'],
    })
    const logs = getLogCollection(config)
    const fields = findCollection(config, 'posts')?.fields
    const createdBy = fields?.[0]
    const updateDelta = fields?.[1] as any
    const userId = logs?.fields.find((field) => 'name' in field && field.name === 'userId')
    const updateUser = updateDelta?.fields.find((field: any) => field.name === 'user')

    expect(userId).toMatchObject({ relationTo: ['users', 'other-users'] })
    expect(createdBy).toMatchObject({ relationTo: ['users', 'other-users'] })
    expect(updateUser).toMatchObject({ relationTo: ['users', 'other-users'] })
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

  test('rejects invalid configurations when preparing plugin values', () => {
    expect(() => preparePluginConfig({ ...basePluginConfig, disabled: true })).toThrow(
      'Invalid audit plugin configuration',
    )
    expect(() => preparePluginConfig({ ...basePluginConfig, enabledCollections: [] })).toThrow(
      'Invalid audit plugin configuration',
    )
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
      custom: { updateDelta: { delta: { label: 'Diff' } } },
    })

    expect(prepared).toMatchObject({
      custom: {
        auditLogCollectionSlug: 'audit-plugin-logs',
        fieldNames: {
          createdBy: 'auditPluginCreatedBy',
          updateDelta: 'auditPluginUpdateDelta',
        },
        updateDelta: {
          date: { label: 'Date' },
          delta: { label: 'Diff' },
        },
      },
      disabled: false,
      enabledCollections: ['posts'],
      logsCollectionHidden: false,
      userCollections: ['users'],
    })
  })

  test('normalizes scalar and array user collections', () => {
    expect(normalizeUserCollections('users')).toEqual(['users'])
    expect(normalizeUserCollections(['users', 'other-users'])).toEqual(['users', 'other-users'])
  })

  test('supports custom collection and field names', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      custom: {
        auditLogCollectionSlug: 'content-audit-logs',
        fieldNames: {
          createdBy: 'createdByUser',
          updateDelta: 'changeHistory',
        },
      },
    })

    expect(findCollection(config, 'content-audit-logs')?.slug).toBe('content-audit-logs')
    expect(
      findCollection(config, 'posts')?.fields.map((field) => 'name' in field && field.name),
    ).toEqual(['createdByUser', 'changeHistory'])
  })

  test('rejects invalid custom collection and field names', () => {
    expect(() =>
      preparePluginConfig({
        ...basePluginConfig,
        custom: { auditLogCollectionSlug: 'Audit Logs' },
      }),
    ).toThrow('Invalid auditLogCollectionSlug')
    expect(() =>
      preparePluginConfig({
        ...basePluginConfig,
        custom: { fieldNames: { createdBy: 'created-by' } },
      }),
    ).toThrow('Invalid fieldNames.createdBy')
    expect(() =>
      preparePluginConfig({
        ...basePluginConfig,
        custom: { fieldNames: { updateDelta: 'update-delta' } },
      }),
    ).toThrow('Invalid fieldNames.updateDelta')
  })
})

describe('audit log hooks', () => {
  test('writes a create log with the created entity and user', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'Post' },
      operation: 'create',
      user: { id: 'user-1', collection: 'users' },
    })

    expect(createAuditLog).toHaveBeenCalledOnce()
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'audit-plugin-logs',
        data: {
          delta: null,
          entity: { relationTo: 'posts', value: 'post-1' },
          operation: 'create',
          userId: { relationTo: 'users', value: 'user-1' },
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
      user: { id: 'user-2', collection: 'users' },
    })

    expect(createAuditLog).toHaveBeenCalledOnce()
    expect(createAuditLog.mock.calls[0]?.[0]).toMatchObject({
      collection: 'audit-plugin-logs',
      data: {
        delta: { title: ['Before', 'After'] },
        entity: { relationTo: 'posts', value: 'post-1' },
        operation: 'update',
        userId: { relationTo: 'users', value: 'user-2' },
      },
    })
  })

  test('excludes ids and timestamps from update deltas and returns the document', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const doc = {
      id: 'post-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      title: 'After',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }
    const createAuditLog = vi.fn()
    const collection = findCollection(config, 'posts')
    const updateHook = collection?.hooks?.afterChange?.[1]

    const result = await updateHook?.({
      collection,
      context: { source: 'test' },
      doc,
      operation: 'update',
      previousDoc: {
        id: 'post-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        title: 'Before',
        updatedAt: '2025-01-02T00:00:00.000Z',
      },
      req: {
        payload: { create: createAuditLog },
        user: { id: 'user-2', collection: 'users' },
      },
    } as unknown as HookArgs)

    expect(result).toBe(doc)
    expect(createAuditLog.mock.calls[0]?.[0]).toMatchObject({
      context: { source: 'test' },
      data: { delta: { title: ['Before', 'After'] } },
      req: expect.any(Object),
    })
    expect(createAuditLog.mock.calls[0]?.[0].data.delta).not.toHaveProperty('id')
    expect(createAuditLog.mock.calls[0]?.[0].data.delta).not.toHaveProperty('createdAt')
    expect(createAuditLog.mock.calls[0]?.[0].data.delta).not.toHaveProperty('updatedAt')
  })

  test('writes polymorphic audit users from a secondary user collection', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      userCollections: ['users', 'other-users'],
    })
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'Post' },
      operation: 'create',
      user: { id: 'other-user-1', collection: 'other-users' },
    })

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: { relationTo: 'other-users', value: 'other-user-1' },
        }),
      }),
    )

    const updateAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'After' },
      operation: 'update',
      previousDoc: { id: 'post-1', title: 'Before' },
      user: { id: 'other-user-1', collection: 'other-users' },
    })

    expect(updateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: { relationTo: 'other-users', value: 'other-user-1' },
        }),
      }),
    )
  })

  test('does not write update logs without a user', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = await runAfterChange(config, {
      doc: { id: 'post-1', title: 'After' },
      operation: 'update',
      previousDoc: { id: 'post-1', title: 'Before' },
      user: null,
    })

    expect(createAuditLog).not.toHaveBeenCalled()
  })

  test('does not write create or update logs for unrelated operations', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])
    const createAuditLog = vi.fn()
    const collection = findCollection(config, 'posts')

    for (const hook of collection?.hooks?.afterChange ?? []) {
      await hook({
        collection,
        context: {},
        doc: { id: 'post-1' },
        operation: 'delete',
        req: {
          payload: { create: createAuditLog },
          user: { id: 'user-1', collection: 'users' },
        },
      } as unknown as HookArgs)
    }

    expect(createAuditLog).not.toHaveBeenCalled()
  })

  describe('audit virtual fields', () => {
    test('hydrates the created-by field from the earliest create log', async () => {
      const config = applyPlugin([{ slug: 'posts', fields: [] }])
      const field = findCollection(config, 'posts')?.fields[0] as any
      const find = vi.fn().mockResolvedValue({
        docs: [{ userId: { relationTo: 'other-users', value: 'user-1' } }],
      })

      const result = await field?.hooks?.afterRead?.[0]?.({
        collection: { slug: 'posts' },
        data: { id: 'post-1' },
        req: { payload: { find } },
      } as any)

      expect(result).toEqual({ relationTo: 'other-users', value: 'user-1' })
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'audit-plugin-logs',
          depth: 0,
          limit: 1,
          sort: 'createdAt',
          where: {
            and: [
              { operation: { equals: 'create' } },
              { 'entity.relationTo': { equals: 'posts' } },
              { 'entity.value': { equals: 'post-1' } },
            ],
          },
        }),
      )
    })

    test('hydrates update history in newest-first order', async () => {
      const config = applyPlugin([{ slug: 'posts', fields: [] }])
      const field = findCollection(config, 'posts')?.fields[1] as any
      const find = vi.fn().mockResolvedValue({
        docs: [
          {
            id: 'log-2',
            createdAt: '2026-01-02',
            delta: { title: ['B', 'C'] },
            userId: { relationTo: 'other-users', value: 'user-2' },
          },
          {
            id: 'log-1',
            createdAt: '2026-01-01',
            delta: { title: ['A', 'B'] },
            userId: { relationTo: 'users', value: 'user-1' },
          },
        ],
      })

      const result = await field?.hooks?.afterRead?.[0]?.({
        collection: { slug: 'posts' },
        data: { id: 'post-1' },
        req: { payload: { find } },
      } as any)

      expect(result).toEqual([
        {
          id: 'log-2',
          date: '2026-01-02',
          delta: { title: ['B', 'C'] },
          user: { relationTo: 'other-users', value: 'user-2' },
        },
        {
          id: 'log-1',
          date: '2026-01-01',
          delta: { title: ['A', 'B'] },
          user: { relationTo: 'users', value: 'user-1' },
        },
      ])
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ pagination: false, sort: '-createdAt' }),
      )
    })

    test('hides virtual fields when they have no applicable data', () => {
      const config = applyPlugin([{ slug: 'posts', fields: [] }])
      const fields = findCollection(config, 'posts')?.fields
      const createdBy = fields?.[0] as any
      const updateDelta = fields?.[1] as any

      expect(createdBy?.admin?.condition?.({} as any, {} as any, {} as any)).toBe(false)
      expect(updateDelta?.admin?.condition?.({} as any, {} as any, {} as any)).toBe(false)
      expect(
        updateDelta?.admin?.condition?.(
          { auditPluginUpdateDelta: [] } as any,
          {} as any,
          {} as any,
        ),
      ).toBe(false)
      expect(
        updateDelta?.admin?.condition?.(
          { auditPluginUpdateDelta: [{}] } as any,
          {} as any,
          {} as any,
        ),
      ).toBe(true)
      expect(createdBy?.access?.create?.({} as any)).toBe(false)
      expect(createdBy?.access?.update?.({} as any)).toBe(false)
      expect(updateDelta?.access?.create?.({} as any)).toBe(false)
      expect(updateDelta?.access?.update?.({} as any)).toBe(false)
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
