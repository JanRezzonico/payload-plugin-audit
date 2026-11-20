/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CollectionAfterChangeHook, CollectionConfig, Config } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import {
  classifyOp,
  formatPath,
  formatValue,
  getOldValue,
} from '../src/components/DeltaViewer.utils.js'
import {
  buildCollectionHref,
  buildEntityHref,
  formFieldValueToTypedObject,
} from '../src/components/utils.js'
import { validateCleanup } from '../src/config/cleanup/validate.js'
import { validateDb } from '../src/config/db/validate.js'
import { isPluginDisabled, mergeConfig } from '../src/config/index.js'
import { validateUserCollections } from '../src/config/user-collections/validate.js'
import { auditPluginPayload } from '../src/index.js'
import { generateLogsCollection } from '../src/libs/collections/logs/index.js'
import { generateCreatedByHook } from '../src/libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from '../src/libs/hooks/update-delta/index.js'
import { generateCleanupLogsTask } from '../src/libs/jobs/cleanup-logs/index.js'
import { AuditPluginValidationError } from '../src/utils/AuditPluginValidationError.js'

type Doc = Record<string, any>
type HookArgs = Parameters<CollectionAfterChangeHook>[0]

const access = {
  delete: vi.fn(({ req }: any) => req.user?.role === 'admin'),
  read: vi.fn(({ req }: any) => Boolean(req.user)),
}

const baseConfig = {
  access,
  collections: ['posts'],
  userCollections: ['users'],
}

const createPayloadConfig = (collections: CollectionConfig[] = []): Config =>
  ({ collections, db: {} as Config['db'], secret: 'test-secret' }) as Config

const findCollection = (config: Config, slug: string) =>
  config.collections?.find((collection) => collection.slug === slug)

const applyPlugin = (
  collections: CollectionConfig[] = [{ slug: 'posts', fields: [] }],
  overrides: Record<string, unknown> = {},
) => {
  const config = createPayloadConfig(collections)
  auditPluginPayload({ ...baseConfig, ...overrides } as any)(config)
  return config
}

const getField = (config: Config, collectionSlug: string, fieldName: string) =>
  findCollection(config, collectionSlug)?.fields?.find(
    (field) => 'name' in field && field.name === fieldName,
  ) as any

const runHook = async (
  hook: CollectionAfterChangeHook,
  args: {
    collection?: any
    context?: any
    doc?: Doc
    operation?: 'create' | 'delete' | 'update'
    previousDoc?: Doc
    user?: { collection: string; id: string } | null
  },
) => {
  const create = vi.fn()
  const result = await hook({
    collection: args.collection ?? { slug: 'posts' },
    context: args.context ?? { source: 'test' },
    doc: args.doc ?? { id: 'post-1' },
    operation: args.operation ?? 'create',
    previousDoc: args.previousDoc,
    req: {
      payload: { create },
      user: args.user === undefined ? { id: 'user-1', collection: 'users' } : args.user,
    },
  } as unknown as HookArgs)
  return { create, result }
}

describe('plugin configuration', () => {
  test('detects disabled state and preserves disabled configs', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])

    expect(isPluginDisabled({ ...baseConfig, state: 'disabled' })).toBe(true)
    expect(isPluginDisabled({ ...baseConfig })).toBe(false)
    expect(auditPluginPayload({ ...baseConfig, state: 'disabled' } as any)(config)).toBe(config)
    expect(config.collections).toHaveLength(1)
  })

  test('merges defaults and nested custom database and UI values', () => {
    const merged = mergeConfig({
      ...baseConfig,
      db: {
        collections: { logs: { slug: ' content-audit-logs ', hidden: true } },
        fields: { createdBy: { name: ' createdByUser ' } },
      },
      ui: {
        fields: {
          createdBy: { label: 'Author' },
          user: { description: { separator: '/' } },
        },
      },
    } as any)

    expect(merged.state).toBe('enabled')
    expect(merged.cleanup).toEqual({ olderThanDays: 90, schedule: '* 0 0 * * *' })
    expect(merged.db).toMatchObject({
      collections: { logs: { slug: 'content-audit-logs', hidden: true } },
      fields: {
        createdBy: { name: 'createdByUser' },
        updateLogs: { name: 'auditPluginUpdateLogs' },
      },
    })

    expect(merged.ui.fields.createdBy.label).toBe('Author')
    expect(merged.ui.fields.user.description).toMatchObject({
      beforeCollection: 'Collection: ',
      beforeId: 'User id: ',
      separator: '/',
    })

    expect(() => mergeConfig({ ...baseConfig, state: 'disabled' } as any)).toThrow(
      AuditPluginValidationError,
    )
  })

  test('validates cleanup settings', () => {
    expect(validateCleanup({ olderThanDays: 7, schedule: '0 0 * * * *' })).toEqual({
      olderThanDays: 7,
      schedule: '0 0 * * * *',
    })
    expect(() => validateCleanup({ olderThanDays: 0 } as any)).toThrow('positive integer')
  })

  test('merges partial access overrides independently and keeps secure defaults', () => {
    const request = (user: unknown) => ({ req: { user } }) as any
    const customCreate = vi.fn(() => true)
    const customDelete = vi.fn(() => true)
    const customRead = vi.fn(() => false)

    const withoutAccess = mergeConfig({ ...baseConfig, access: undefined } as any)
    expect(withoutAccess.access.delete(request({ id: 'user-1' }))).toBe(false)
    expect(withoutAccess.access.read(request({ id: 'user-1' }))).toBe(true)
    expect(withoutAccess.access.read(request(null))).toBe(false)

    const partial = mergeConfig({
      ...baseConfig,
      access: { create: customCreate },
    } as any)
    expect(partial.access.delete(request({ id: 'user-1' }))).toBe(false)
    expect(partial.access.read(request({ id: 'user-1' }))).toBe(true)

    const mixed = mergeConfig({
      ...baseConfig,
      access: { create: customCreate, delete: customDelete, read: customRead },
    } as any)
    expect(mixed.access.delete).toBe(customDelete)
    expect(mixed.access.read).toBe(customRead)
    expect(mixed.access.delete(request(null))).toBe(true)
    expect(mixed.access.read(request({ id: 'user-1' }))).toBe(false)

    const invalid = mergeConfig({
      ...baseConfig,
      access: { create: null, delete: 'not-an-access-function', read: undefined },
    } as any)
    expect(invalid.access.delete(request({ id: 'user-1' }))).toBe(false)
    expect(invalid.access.read(request({ id: 'user-1' }))).toBe(true)
  })

  test('validates database and user collection values', () => {
    expect(
      validateDb({ collections: { logs: { slug: 'custom-logs' } } } as any).collections.logs.slug,
    ).toBe('custom-logs')
    expect(() => validateDb({ collections: { logs: { slug: 'Audit Logs' } } } as any)).toThrow(
      'kebab-case',
    )
    expect(() => validateDb({ fields: { createdBy: { name: 'created-by' } } } as any)).toThrow(
      'lowerCamelCase',
    )
    expect(validateUserCollections(['users'])).toEqual(['users'])
    expect(() => validateUserCollections([])).toThrow('cannot be empty')
  })

  test('uses the custom database names consistently in the plugin transform', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      db: {
        collections: { logs: { slug: 'content-audit-logs', hidden: true } },
        fields: { createdBy: { name: 'createdByUser' }, updateLogs: { name: 'changeHistory' } },
      },
    })

    expect(findCollection(config, 'content-audit-logs')).toMatchObject({
      slug: 'content-audit-logs',
      admin: { hidden: true },
    })
    expect(
      findCollection(config, 'posts')?.fields.map((field) => 'name' in field && field.name),
    ).toEqual(['createdByUser', 'changeHistory'])
  })
})

describe('plugin collection transform and log collection', () => {
  test('adds fields and hooks only to configured collections while preserving existing values', () => {
    const existingHook = vi.fn()
    const config = applyPlugin([
      {
        slug: 'posts',
        fields: [{ name: 'title', type: 'text' }],
        hooks: { afterChange: [existingHook] },
      },
      { slug: 'media', fields: [] },
    ])
    const posts = findCollection(config, 'posts')

    expect(config.collections).toHaveLength(3)
    expect(posts?.fields.map((field) => 'name' in field && field.name)).toEqual([
      'title',
      'auditPluginCreatedBy',
      'auditPluginUpdateLogs',
    ])
    expect(posts?.hooks?.afterChange).toHaveLength(3)
    expect(posts?.hooks?.afterChange?.[0]).toBe(existingHook)
    expect(findCollection(config, 'media')?.fields).toEqual([])
  })

  test('adds the scheduled cleanup task without replacing existing jobs', () => {
    const existingTask = { slug: 'existing-task', handler: vi.fn() }
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [existingTask] }
    auditPluginPayload(baseConfig as any)(config)

    expect(config.jobs?.tasks).toHaveLength(2)
    expect(config.jobs?.tasks?.[0]).toBe(existingTask)
    expect(config.jobs?.tasks?.[1]).toMatchObject({
      slug: 'payload-plugin-audit-cleanup-logs',
      schedule: [{ cron: '* 0 0 * * *', queue: 'default' }],
    })
  })

  test('cleanup deletes only old update logs', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T00:00:00.000Z'))
    const cleanupConfig = mergeConfig({
      ...baseConfig,
      cleanup: { olderThanDays: 30 },
    } as any)
    const deleteMany = vi.fn()
    const task = generateCleanupLogsTask(cleanupConfig)

    await (task.handler as any)({ req: { payload: { db: { deleteMany } } } })

    expect(deleteMany).toHaveBeenCalledWith({
      collection: 'audit-plugin-logs',
      req: { payload: { db: { deleteMany } } },
      where: {
        and: [
          { operation: { equals: 'update' } },
          { createdAt: { less_than: '2026-01-01T00:00:00.000Z' } },
        ],
      },
    })
    vi.useRealTimers()
  })

  test('keeps virtual fields but omits hooks when inactive and initializes missing collections', () => {
    const config = createPayloadConfig()
    auditPluginPayload({ ...baseConfig, state: 'inactive' } as any)(config)

    expect(config.collections).toHaveLength(1)
    expect(findCollection(config, 'audit-plugin-logs')).toBeDefined()
    expect(findCollection(config, 'posts')).toBeUndefined()
  })

  test('generates the protected polymorphic logs collection', () => {
    const config = mergeConfig({
      ...baseConfig,
      collections: ['posts', 'media'],
      userCollections: ['users', 'other-users'],
    } as any)
    const logs = generateLogsCollection(config)

    expect(logs).toMatchObject({
      slug: 'audit-plugin-logs',
      admin: { hidden: false },
      timestamps: true,
    })
    expect(logs.access?.read).toBe(access.read)
    expect(logs.access?.delete).toBe(access.delete)
    expect(logs.fields.map((field) => 'name' in field && field.name)).toEqual([
      'operation',
      'entity',
      'user',
      'delta',
    ])
    expect(logs.fields[0]).toMatchObject({
      type: 'select',
      options: ['create', 'update'],
      required: true,
    })
    expect(logs.fields[1]).toMatchObject({
      index: true,
      relationTo: ['posts', 'media'],
      required: true,
    })
    expect(logs.fields[2]).toMatchObject({ relationTo: ['users', 'other-users'], required: true })
    expect(logs.fields[3]).toMatchObject({
      type: 'json',
      admin: { readOnly: true },
      required: false,
    })
    expect((logs.fields[0] as any).access.update({})).toBe(false)
    expect((logs.fields[3] as any).access.update({})).toBe(false)
  })
})

describe('audit hooks', () => {
  test('writes create logs, forwards context and request, and returns undefined', async () => {
    const config = mergeConfig(baseConfig as any)
    const { create, result } = await runHook(generateCreatedByHook(config), {
      context: { source: 'import' },
      doc: { id: 'post-1', title: 'Post' },
    })

    expect(result).toBeUndefined()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'audit-plugin-logs',
        context: { source: 'import' },
        data: {
          delta: null,
          entity: { relationTo: 'posts', value: 'post-1' },
          operation: 'create',
          user: { relationTo: 'users', value: 'user-1' },
        },
        overrideAccess: true,
        req: expect.any(Object),
      }),
    )
  })

  test('ignores non-create operations and unauthenticated creates', async () => {
    const config = mergeConfig(baseConfig as any)
    const hook = generateCreatedByHook(config)
    const ignored = await runHook(hook, { operation: 'update' })
    const anonymous = await runHook(hook, { user: null })

    expect(ignored.create).not.toHaveBeenCalled()
    expect(anonymous.create).not.toHaveBeenCalled()
  })

  test('writes update deltas for polymorphic users and excludes metadata', async () => {
    const config = mergeConfig({ ...baseConfig, userCollections: ['users', 'other-users'] } as any)
    const { create, result } = await runHook(generateUpdateDeltaHook(config), {
      doc: {
        id: 'post-1',
        createdAt: '2026-01-02',
        title: 'After',
        unchanged: true,
        updatedAt: '2026-01-03',
      },
      operation: 'update',
      previousDoc: {
        id: 'post-1',
        createdAt: '2026-01-01',
        title: 'Before',
        unchanged: true,
        updatedAt: '2026-01-02',
      },
      user: { id: 'other-1', collection: 'other-users' },
    })

    expect(result).toEqual(expect.objectContaining({ id: 'post-1', title: 'After' }))
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          delta: { title: ['Before', 'After'] },
          entity: { relationTo: 'posts', value: 'post-1' },
          operation: 'update',
          user: { relationTo: 'other-users', value: 'other-1' },
        },
      }),
    )
    expect(create.mock.calls[0][0].data.delta).not.toHaveProperty('id')
    expect(create.mock.calls[0][0].data.delta).not.toHaveProperty('createdAt')
    expect(create.mock.calls[0][0].data.delta).not.toHaveProperty('updatedAt')
  })

  test('ignores non-update operations and updates without a user', async () => {
    const config = mergeConfig(baseConfig as any)
    const hook = generateUpdateDeltaHook(config)
    const ignored = await runHook(hook, { operation: 'create' })
    const anonymous = await runHook(hook, {
      doc: { id: 'post-1', title: 'After' },
      operation: 'update',
      previousDoc: { id: 'post-1', title: 'Before' },
      user: null,
    })

    expect(ignored.create).not.toHaveBeenCalled()
    expect(anonymous.create).not.toHaveBeenCalled()
  })
})

describe('virtual audit fields', () => {
  test('loads the earliest creator and returns undefined without a document or log', async () => {
    const config = applyPlugin()
    const field = getField(config, 'posts', 'auditPluginCreatedBy')
    const find = vi
      .fn()
      .mockResolvedValue({ docs: [{ user: { relationTo: 'users', value: 'u-1' } }] })
    const hook = field.hooks.afterRead[0]

    await expect(
      hook({ collection: { slug: 'posts' }, data: {}, req: { payload: { find } } } as any),
    ).resolves.toBeUndefined()
    await expect(
      hook({
        collection: { slug: 'posts' },
        data: { id: 'post-1' },
        req: { payload: { find } },
      } as any),
    ).resolves.toEqual({ relationTo: 'users', value: 'u-1' })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'audit-plugin-logs',
        depth: 0,
        limit: 1,
        pagination: false,
        sort: 'createdAt',
        where: expect.objectContaining({ and: expect.any(Array) }),
      }),
    )

    find.mockResolvedValueOnce({ docs: [] })
    await expect(
      hook({
        collection: { slug: 'posts' },
        data: { id: 'missing' },
        req: { payload: { find } },
      } as any),
    ).resolves.toBeUndefined()
  })

  test('loads update history newest-first and maps audit records', async () => {
    const config = applyPlugin()
    const field = getField(config, 'posts', 'auditPluginUpdateLogs')
    const find = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 'log-2',
          createdAt: '2026-02-01',
          delta: { title: ['B', 'C'] },
          user: { relationTo: 'users', value: 'u-2' },
        },
        {
          id: 'log-1',
          createdAt: '2026-01-01',
          delta: { title: ['A', 'B'] },
          user: { relationTo: 'users', value: 'u-1' },
        },
      ],
    })
    const result = await field.hooks.afterRead[0]({
      collection: { slug: 'posts' },
      data: { id: 'post-1' },
      req: { payload: { find } },
    } as any)

    expect(result).toEqual([
      {
        id: 'log-2',
        date: '2026-02-01',
        delta: { title: ['B', 'C'] },
        user: { relationTo: 'users', value: 'u-2' },
      },
      {
        id: 'log-1',
        date: '2026-01-01',
        delta: { title: ['A', 'B'] },
        user: { relationTo: 'users', value: 'u-1' },
      },
    ])
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: false, sort: '-createdAt' }),
    )
    expect(field.admin.condition({})).toBe(false)
    expect(field.admin.condition({ auditPluginUpdateLogs: [] })).toBe(false)
    expect(field.admin.condition({ auditPluginUpdateLogs: [{}] })).toBe(true)
  })

  test('configures virtual fields as read-only relationships and arrays', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      userCollections: ['users', 'other-users'],
    })
    const createdBy = getField(config, 'posts', 'auditPluginCreatedBy')
    const updateLogs = getField(config, 'posts', 'auditPluginUpdateLogs')

    expect(createdBy).toMatchObject({
      type: 'relationship',
      admin: { readOnly: true },
      relationTo: ['users', 'other-users'],
      virtual: true,
    })
    expect(updateLogs).toMatchObject({
      type: 'array',
      admin: { readOnly: true },
      required: false,
      virtual: true,
    })
    expect(updateLogs.fields.map((field: any) => field.name)).toEqual(['user', 'date', 'delta'])
    expect(createdBy.access.create({})).toBe(false)
    expect(createdBy.access.update({})).toBe(false)
    expect(updateLogs.access.create({})).toBe(false)
    expect(updateLogs.access.update({})).toBe(false)
  })
})

describe('client utility behavior', () => {
  test('formats paths, values, old values and operations', () => {
    expect(formatPath('/profile/name~1key/~0value')).toBe('profile.name/key.~value')
    expect(formatValue(undefined)).toBe('undefined')
    expect(formatValue({ name: 'Ada' }).replaceAll(/\s/g, '')).toBe('{"name":"Ada"}')
    expect(getOldValue({ profile: { name: ['old', 'new'] } } as any, '/profile/name')).toBe('old')
    expect(getOldValue({ profile: {} } as any, '/profile/name')).toBeUndefined()
    expect(classifyOp({ op: 'add', path: '/x', value: 1 } as any, undefined)).toBe('added')
    expect(classifyOp({ from: '/y', op: 'move', path: '/x' } as any, undefined)).toBe('moved')
    expect(classifyOp({ op: 'remove', path: '/x' } as any, undefined)).toBe('removed')
    expect(classifyOp({ op: 'replace', path: '/x', value: 'new' } as any, '')).toBe('added')
    expect(classifyOp({ op: 'replace', path: '/x', value: '' } as any, 'old')).toBe('removed')
    expect(classifyOp({ op: 'replace', path: '/x', value: 0 } as any, false)).toBe('updated')
  })

  test('converts valid relationship values to admin URLs and rejects invalid values', () => {
    const clientConfig = { routes: { admin: '/admin' } } as any
    expect(formFieldValueToTypedObject(null)).toBeNull()
    expect(formFieldValueToTypedObject({ relationTo: 'users' })).toBeNull()
    expect(formFieldValueToTypedObject({ relationTo: 'users', value: 'user-1' })).toEqual({
      id: 'user-1',
      slug: 'users',
    })
    expect(buildCollectionHref('users', clientConfig)).toBe('/admin/collections/users')
    expect(buildEntityHref('users', 'user-1', clientConfig)).toBe('/admin/collections/users/user-1')
  })
})

describe('validation error', () => {
  test('has a stable error name and Error identity', () => {
    const error = new AuditPluginValidationError('invalid')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AuditPluginValidationError')
    expect(error.message).toBe('invalid')
  })
})
