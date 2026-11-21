/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CollectionAfterChangeHook, CollectionConfig, Config } from 'payload'

import { afterEach, describe, expect, test, vi } from 'vitest'

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
import { AUDIT_CLEANUP_TASK_SLUG, auditPluginPayload, cleanupAuditLogs } from '../src/index.js'
import { generateLogsCollection } from '../src/libs/collections/logs/index.js'
import { generateCreatedByHook } from '../src/libs/hooks/created-by/index.js'
import { generateUpdateDeltaHook } from '../src/libs/hooks/update-delta/index.js'
import { cleanupLogs } from '../src/libs/jobs/cleanup-logs/cleanup.js'
import { generateCleanupLogsTask } from '../src/libs/jobs/cleanup-logs/index.js'
import { AuditPluginValidationError } from '../src/utils/AuditPluginValidationError.js'

type Doc = Record<string, any>
type HookArgs = Parameters<CollectionAfterChangeHook>[0]

const access = {
  delete: vi.fn(({ req }: any) => req.user?.role === 'admin'),
  read: vi.fn(({ req }: any) => Boolean(req.user)),
}

// Plain config: cleanup is off by default, so this exercises the real defaults.
const baseConfig = {
  access,
  collections: ['posts'],
  userCollections: ['users'],
}

// Same config with the cleanup feature opted in (it is disabled by default).
const withCleanup = { ...baseConfig, cleanup: { enabled: true } }

const AUDIT_PLUGIN_QUEUE = 'payload-plugin-audit'
const DEFAULT_TASK_SLUG = 'payload-plugin-audit-cleanup-logs'

const createPayloadConfig = (collections: CollectionConfig[] = []): Config =>
  ({ collections, db: {} as Config['db'], secret: 'test-secret' }) as Config

const findCollection = (config: Config, slug: string) =>
  config.collections?.find((collection) => collection.slug === slug)

const applyPlugin = (
  collections: CollectionConfig[] = [{ slug: 'posts', fields: [] }],
  overrides: Record<string, unknown> = {},
) => {
  const config = createPayloadConfig(collections)
  return auditPluginPayload({ ...baseConfig, ...overrides } as any)(config)
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

// Guarantees fake timers never leak into other tests, even if an assertion fails mid-test.
afterEach(() => {
  vi.useRealTimers()
})

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
    expect(merged.cleanup).toEqual({
      enabled: false,
      olderThanDays: 90,
      schedule: '0 0 * * *',
      silent: false,
    })
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

describe('cleanup validation', () => {
  test('applies defaults (disabled) and accepts valid overrides', () => {
    expect(validateCleanup({ olderThanDays: 7, schedule: '0 0 * * * *' })).toEqual({
      enabled: false,
      olderThanDays: 7,
      schedule: '0 0 * * * *', // 6-field (seconds) cron is accepted
      silent: false,
    })
    expect(validateCleanup(undefined)).toEqual(validateCleanup({}))
  })

  test('is disabled by default and can be enabled explicitly', () => {
    expect(validateCleanup(undefined).enabled).toBe(false)
    expect(validateCleanup({}).enabled).toBe(false)
    expect(validateCleanup({ enabled: true }).enabled).toBe(true)
  })

  test.each([0, -1, 1.5, Number.NaN, Infinity, '7'])('rejects olderThanDays = %s', (value) => {
    expect(() => validateCleanup({ olderThanDays: value } as any)).toThrow('olderThanDays')
  })

  test.each(['not-a-cron', '', '* * *', '99 * * * *'])('rejects schedule = %j', (value) => {
    expect(() => validateCleanup({ schedule: value } as any)).toThrow('cleanup.schedule')
  })

  // Validation intentionally stays on even when the feature is disabled.
  test('keeps validating when cleanup is disabled', () => {
    expect(() => validateCleanup({ enabled: false, schedule: 'garbage' } as any)).toThrow(
      'cleanup.schedule',
    )
    expect(() => validateCleanup({ enabled: false, olderThanDays: 0 } as any)).toThrow(
      'olderThanDays',
    )
    // Same for the implicit default (disabled): invalid values still throw.
    expect(() => validateCleanup({ schedule: 'garbage' } as any)).toThrow('cleanup.schedule')
  })

  test('accepts valid values when disabled', () => {
    expect(validateCleanup({ enabled: false })).toMatchObject({ enabled: false })
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

  test('keeps virtual fields but omits hooks when inactive', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], { state: 'inactive' })
    const posts = findCollection(transformed, 'posts')

    expect(posts?.fields).toHaveLength(2)
    expect(posts?.hooks?.afterChange).toBeUndefined()
    expect(findCollection(transformed, 'audit-plugin-logs')).toBeDefined()
  })

  test('initializes missing collections', () => {
    const config = createPayloadConfig()
    delete (config as any).collections
    const transformed = auditPluginPayload({ ...baseConfig, state: 'inactive' } as any)(config)

    expect(transformed.collections).toHaveLength(1)
    expect(findCollection(transformed, 'audit-plugin-logs')).toBeDefined()
    expect(findCollection(transformed, 'posts')).toBeUndefined()
  })

  test('does not mutate the host config or its collections', () => {
    const posts: CollectionConfig = { slug: 'posts', fields: [{ name: 'title', type: 'text' }] }
    const hostCollections = [posts]
    const hostJobs = { tasks: [{ slug: 'existing-task', handler: vi.fn() }] }
    const config = { collections: hostCollections, jobs: hostJobs, secret: 's' } as any

    // Cleanup is enabled so the jobs transform actually runs against the host jobs.
    const transformed = auditPluginPayload(withCleanup as any)(config)

    expect(transformed).not.toBe(config)
    expect(config.collections).toBe(hostCollections)
    expect(hostCollections).toHaveLength(1)
    expect(posts.fields).toHaveLength(1)
    expect(posts.hooks).toBeUndefined()
    expect(config.jobs).toBe(hostJobs)
    expect(hostJobs.tasks).toHaveLength(1)
    expect(hostJobs).not.toHaveProperty('autoRun')
    expect(transformed.jobs).not.toBe(hostJobs)
    expect(transformed.collections?.[0]).not.toBe(posts)
  })

  test('throws when the logs collection slug already exists', () => {
    expect(() =>
      applyPlugin([
        { slug: 'posts', fields: [] },
        { slug: 'audit-plugin-logs', fields: [] },
      ]),
    ).toThrow(AuditPluginValidationError)
  })

  test('throws when applied twice to the same config', () => {
    const once = applyPlugin()
    expect(() => auditPluginPayload(baseConfig as any)(once)).toThrow(AuditPluginValidationError)
  })

  // Requires the reserved-field-name guard in src/index.ts (see notes). Remove this test
  // if you decide not to add that guard.
  test('throws when an audited collection already has a reserved virtual field name', () => {
    expect(() =>
      applyPlugin([{ slug: 'posts', fields: [{ name: 'auditPluginCreatedBy', type: 'text' }] }]),
    ).toThrow(AuditPluginValidationError)
    expect(() =>
      applyPlugin([{ slug: 'posts', fields: [{ name: 'auditPluginUpdateLogs', type: 'text' }] }]),
    ).toThrow(AuditPluginValidationError)
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

describe('cleanup jobs transform', () => {
  test('adds the scheduled cleanup task without replacing existing jobs', () => {
    const existingTask = { slug: 'existing-task', handler: vi.fn() }
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [existingTask] }
    const transformed = auditPluginPayload(withCleanup as any)(config)

    expect(transformed.jobs?.tasks).toHaveLength(2)
    expect(transformed.jobs?.tasks?.[0]).toBe(existingTask)
    expect(transformed.jobs?.tasks?.[1]).toMatchObject({
      slug: DEFAULT_TASK_SLUG,
      retries: 2,
      schedule: [{ cron: '0 0 * * *', queue: AUDIT_PLUGIN_QUEUE }],
    })
    expect(transformed.jobs).not.toHaveProperty('autoRun')
  })

  test('creates a jobs config when the host has none', () => {
    const transformed = applyPlugin(undefined, { cleanup: { enabled: true } })

    expect(transformed.jobs?.tasks).toHaveLength(1)
    expect(transformed.jobs).not.toHaveProperty('autoRun')
  })

  test('cleanup is off by default: jobs are left untouched but the logs collection is still added', () => {
    const transformed = applyPlugin()

    expect(transformed.jobs).toBeUndefined()
    expect(findCollection(transformed, 'audit-plugin-logs')).toBeDefined()
  })

  test('cleanup disabled explicitly leaves jobs untouched but still adds the logs collection', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], {
      cleanup: { enabled: false },
    })

    expect(transformed.jobs).toBeUndefined()
    expect(findCollection(transformed, 'audit-plugin-logs')).toBeDefined()
  })

  test('cleanup disabled (default or explicit) preserves existing jobs by reference', () => {
    const existingTask = { slug: 'existing-task', handler: vi.fn() }

    const byDefault = createPayloadConfig([{ slug: 'posts', fields: [] }])
    byDefault.jobs = { tasks: [existingTask] }
    const defaultResult = auditPluginPayload(baseConfig as any)(byDefault)

    expect(defaultResult.jobs).toBe(byDefault.jobs)
    expect(defaultResult.jobs?.tasks).toEqual([existingTask])

    const explicit = createPayloadConfig([{ slug: 'posts', fields: [] }])
    explicit.jobs = { tasks: [existingTask] }
    const explicitResult = auditPluginPayload({
      ...baseConfig,
      cleanup: { enabled: false },
    } as any)(explicit)

    expect(explicitResult.jobs).toBe(explicit.jobs)
    expect(explicitResult.jobs?.tasks).toEqual([existingTask])
  })

  // The plugin only queues the cleanup job. Running the queue is up to the host
  // application (autoRun, bin script, or an external cron hitting the endpoints).
  test('never adds autoRun and leaves a host autoRun array untouched', () => {
    const hostAutoRun = [{ cron: '*/5 * * * *', queue: 'default' }]
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: hostAutoRun }

    const transformed = auditPluginPayload(withCleanup as any)(config)

    expect(transformed.jobs?.autoRun).toBe(hostAutoRun)
    expect(hostAutoRun).toHaveLength(1)
    expect(transformed.jobs?.tasks).toHaveLength(1)
  })

  test('leaves a host autoRun function untouched', () => {
    const hostFn = vi.fn(() => [{ cron: '*/5 * * * *', queue: 'default' }])
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: hostFn as any }

    const transformed = auditPluginPayload(withCleanup as any)(config)

    expect(transformed.jobs?.autoRun).toBe(hostFn)
    expect(hostFn).not.toHaveBeenCalled()
  })

  test('preserves other host jobs settings', () => {
    const shouldAutoRun = vi.fn(() => true)
    const jobsCollectionOverrides = ({ defaultJobsCollection }: any) => defaultJobsCollection
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { jobsCollectionOverrides, shouldAutoRun } as any

    const transformed = auditPluginPayload(withCleanup as any)(config)

    expect(transformed.jobs?.shouldAutoRun).toBe(shouldAutoRun)
    expect((transformed.jobs as any).jobsCollectionOverrides).toBe(jobsCollectionOverrides)
  })

  test('throws on a task slug collision', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [{ slug: DEFAULT_TASK_SLUG, handler: vi.fn() }] } as any

    expect(() => auditPluginPayload(withCleanup as any)(config)).toThrow(AuditPluginValidationError)
  })

  test('does not check for a task slug collision when cleanup is disabled', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [{ slug: DEFAULT_TASK_SLUG, handler: vi.fn() }] } as any

    expect(() => auditPluginPayload(baseConfig as any)(config)).not.toThrow()
  })

  test('does not apply the jobs transform when the plugin is disabled', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    const transformed = auditPluginPayload({ ...withCleanup, state: 'disabled' } as any)(config)

    expect(transformed.jobs).toBeUndefined()
  })
})

describe('cleanup task handler', () => {
  test('cleanup deletes only old update logs', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T00:00:00.000Z'))

    const cleanupConfig = mergeConfig({
      ...baseConfig,
      cleanup: { olderThanDays: 30 },
    } as any)
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })
    const req = { payload: { db: { count, deleteMany } } }
    const task = generateCleanupLogsTask(cleanupConfig)

    await (task.handler as any)({ req })

    expect(deleteMany).toHaveBeenCalledWith({
      collection: 'audit-plugin-logs',
      req,
      where: {
        and: [
          { operation: { equals: 'update' } },
          { createdAt: { less_than: '2026-01-01T00:00:00.000Z' } },
        ],
      },
    })
  })

  test('cleanup uses the custom logs collection and respects olderThanDays', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T12:00:00.000Z'))
    const cleanupConfig = mergeConfig({
      ...baseConfig,
      cleanup: { olderThanDays: 1 },
      db: { collections: { logs: { slug: 'custom-logs' } } },
    } as any)
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })
    const task = generateCleanupLogsTask(cleanupConfig)

    await (task.handler as any)({ req: { payload: { db: { count, deleteMany } } } })

    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'custom-logs',
        where: {
          and: [
            { operation: { equals: 'update' } },
            { createdAt: { less_than: '2026-03-30T12:00:00.000Z' } },
          ],
        },
      }),
    )
  })

  test('cleanup handler returns an empty output', async () => {
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })
    const task = generateCleanupLogsTask(mergeConfig(baseConfig as any))
    const result = await (task.handler as any)({
      req: { payload: { db: { count, deleteMany } } },
    })

    expect(result).toEqual({ output: {} })
  })

  test('cleanup handler propagates database errors so the job can retry', async () => {
    const task = generateCleanupLogsTask(mergeConfig(baseConfig as any))
    const deleteMany = vi.fn().mockRejectedValue(new Error('db down'))
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })

    await expect(
      (task.handler as any)({ req: { payload: { db: { count, deleteMany } } } }),
    ).rejects.toThrow('db down')
    expect(task.retries).toBe(2)
  })
})

describe('cleanupLogs function', () => {
  test('deletes only old update logs from the given collection', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T00:00:00.000Z'))
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })

    await cleanupLogs({
      collectionSlug: 'custom-logs',
      olderThanDays: 30,
      payload: { db: { count, deleteMany } } as any,
    })

    expect(deleteMany).toHaveBeenCalledWith({
      collection: 'custom-logs',
      req: undefined,
      where: {
        and: [
          { operation: { equals: 'update' } },
          { createdAt: { less_than: '2026-01-01T00:00:00.000Z' } },
        ],
      },
    })
  })

  test('forwards the request when provided', async () => {
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })
    const req = { id: 'req' } as any

    await cleanupLogs({
      collectionSlug: 'audit-plugin-logs',
      olderThanDays: 1,
      payload: { db: { count, deleteMany } } as any,
      req,
    })

    expect(deleteMany).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  test('propagates database errors', async () => {
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })
    const deleteMany = vi.fn().mockRejectedValue(new Error('db down'))

    await expect(
      cleanupLogs({
        collectionSlug: 'audit-plugin-logs',
        olderThanDays: 1,
        payload: { db: { count, deleteMany } } as any,
      }),
    ).rejects.toThrow('db down')
  })

  test('is exposed publicly together with the task slug', () => {
    expect(cleanupAuditLogs).toBe(cleanupLogs)
    expect(AUDIT_CLEANUP_TASK_SLUG).toBe(DEFAULT_TASK_SLUG)

    const transformed = applyPlugin(undefined, { cleanup: { enabled: true } })
    expect(transformed.jobs?.tasks?.some((task) => task.slug === AUDIT_CLEANUP_TASK_SLUG)).toBe(
      true,
    )
  })

  test('works without the plugin scheduling anything (cleanup disabled)', async () => {
    const transformed = applyPlugin()
    const deleteMany = vi.fn()
    const count = vi.fn().mockResolvedValue({ totalDocs: 5 })

    expect(transformed.jobs).toBeUndefined()
    await expect(
      cleanupAuditLogs({
        collectionSlug: 'audit-plugin-logs',
        olderThanDays: 30,
        payload: { db: { count, deleteMany } } as any,
      }),
    ).resolves.toBeUndefined()
    expect(deleteMany).toHaveBeenCalledTimes(1)
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
