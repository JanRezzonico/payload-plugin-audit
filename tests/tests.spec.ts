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

const DEFAULT_QUEUE = 'payload-plugin-audit'
const DEFAULT_TASK_SLUG = 'payload-plugin-audit-cleanup-logs'
const defaultAutoRunEntry = { cron: '* * * * *', limit: 10, queue: DEFAULT_QUEUE }

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
      autoRun: { cron: '* * * * *', enabled: true, limit: 10 },
      enabled: true,
      olderThanDays: 90,
      queue: DEFAULT_QUEUE,
      schedule: '0 0 * * *',
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
  test('applies defaults and accepts valid overrides', () => {
    expect(validateCleanup({ olderThanDays: 7, schedule: '0 0 * * * *' })).toEqual({
      autoRun: { cron: '* * * * *', enabled: true, limit: 10 },
      enabled: true,
      olderThanDays: 7,
      queue: DEFAULT_QUEUE,
      schedule: '0 0 * * * *', // 6-field (seconds) cron is accepted
    })
    expect(validateCleanup(undefined)).toEqual(validateCleanup({}))
  })

  test.each([0, -1, 1.5, Number.NaN, Infinity, '7'])('rejects olderThanDays = %s', (value) => {
    expect(() => validateCleanup({ olderThanDays: value } as any)).toThrow('olderThanDays')
  })

  test.each([0, -1, 1.5, Number.NaN, '10'])('rejects autoRun.limit = %s', (value) => {
    expect(() => validateCleanup({ autoRun: { limit: value } } as any)).toThrow(
      'cleanup.autoRun.limit',
    )
  })

  test.each(['not-a-cron', '', '* * *', '99 * * * *'])('rejects schedule = %j', (value) => {
    expect(() => validateCleanup({ schedule: value } as any)).toThrow('cleanup.schedule')
  })

  test.each(['not-a-cron', '', '99 * * * *'])('rejects autoRun.cron = %j', (value) => {
    expect(() => validateCleanup({ autoRun: { cron: value } } as any)).toThrow(
      'cleanup.autoRun.cron',
    )
  })

  test('rejects blank queue and trims surrounding whitespace', () => {
    expect(() => validateCleanup({ queue: '   ' } as any)).toThrow('cleanup.queue')
    expect(validateCleanup({ queue: '  custom-cleanup  ' } as any).queue).toBe('custom-cleanup')
  })

  // Validation intentionally stays on even when the feature is disabled.
  test('keeps validating when cleanup or autoRun is disabled', () => {
    expect(() => validateCleanup({ enabled: false, schedule: 'garbage' } as any)).toThrow(
      'cleanup.schedule',
    )
    expect(() => validateCleanup({ enabled: false, olderThanDays: 0 } as any)).toThrow(
      'olderThanDays',
    )
    expect(() => validateCleanup({ autoRun: { cron: 'garbage', enabled: false } } as any)).toThrow(
      'cleanup.autoRun.cron',
    )
    expect(() => validateCleanup({ autoRun: { enabled: false, limit: 0 } } as any)).toThrow(
      'cleanup.autoRun.limit',
    )
  })

  test('accepts valid values when disabled', () => {
    expect(validateCleanup({ autoRun: { enabled: false }, enabled: false } as any)).toMatchObject({
      autoRun: { enabled: false },
      enabled: false,
    })
  })

  // If this fails, deepMergeWithSourceArrays lets explicit `undefined` overwrite defaults
  // (e.g. `queue: process.env.AUDIT_QUEUE`). Strip undefined keys before merging, or use `??`.
  test('does not let undefined values overwrite defaults', () => {
    const result = validateCleanup({
      autoRun: { cron: undefined, limit: undefined },
      olderThanDays: undefined,
      queue: undefined,
      schedule: undefined,
    } as any)

    expect(result).toEqual(validateCleanup({}))
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

    const transformed = auditPluginPayload(baseConfig as any)(config)

    expect(transformed).not.toBe(config)
    expect(config.collections).toBe(hostCollections)
    expect(hostCollections).toHaveLength(1)
    expect(posts.fields).toHaveLength(1)
    expect(posts.hooks).toBeUndefined()
    expect(hostJobs.tasks).toHaveLength(1)
    expect(hostJobs).not.toHaveProperty('autoRun')
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
    const transformed = auditPluginPayload(baseConfig as any)(config)

    expect(transformed.jobs?.tasks).toHaveLength(2)
    expect(transformed.jobs?.tasks?.[0]).toBe(existingTask)
    expect(transformed.jobs?.tasks?.[1]).toMatchObject({
      slug: DEFAULT_TASK_SLUG,
      retries: 2,
      schedule: [{ cron: '0 0 * * *', queue: DEFAULT_QUEUE }],
    })
    expect(transformed.jobs?.autoRun).toEqual([defaultAutoRunEntry])
  })

  test('creates a jobs config when the host has none', () => {
    const transformed = applyPlugin()

    expect(transformed.jobs?.tasks).toHaveLength(1)
    expect(transformed.jobs?.autoRun).toEqual([defaultAutoRunEntry])
  })

  test('cleanup disabled leaves jobs untouched but still adds the logs collection', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], {
      cleanup: { enabled: false },
    })

    expect(transformed.jobs).toBeUndefined()
    expect(findCollection(transformed, 'audit-plugin-logs')).toBeDefined()
  })

  test('cleanup disabled preserves existing jobs by reference', () => {
    const existingTask = { slug: 'existing-task', handler: vi.fn() }
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [existingTask] }

    const transformed = auditPluginPayload({
      ...baseConfig,
      cleanup: { enabled: false },
    } as any)(config)

    expect(transformed.jobs).toBe(config.jobs)
    expect(transformed.jobs?.tasks).toEqual([existingTask])
  })

  test('autoRun disabled adds the task but no autoRun entry', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], {
      cleanup: { autoRun: { enabled: false } },
    })

    expect(transformed.jobs?.tasks).toHaveLength(1)
    expect(transformed.jobs).not.toHaveProperty('autoRun')
  })

  test('autoRun disabled preserves the host autoRun untouched', () => {
    const hostAutoRun = [{ cron: '*/5 * * * *', queue: 'default' }]
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: hostAutoRun }

    const transformed = auditPluginPayload({
      ...baseConfig,
      cleanup: { autoRun: { enabled: false } },
    } as any)(config)

    expect(transformed.jobs?.autoRun).toBe(hostAutoRun)
  })

  test('appends to a host autoRun array without mutating it', () => {
    const hostEntry = { cron: '*/5 * * * *', limit: 5, queue: 'default' }
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: [hostEntry] }

    const transformed = auditPluginPayload(baseConfig as any)(config)

    expect(transformed.jobs?.autoRun).toEqual([hostEntry, defaultAutoRunEntry])
    expect(config.jobs?.autoRun).toEqual([hostEntry])
  })

  test('does not duplicate an existing auto-run queue', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = {
      autoRun: [{ cron: '*/5 * * * *', limit: 1, queue: DEFAULT_QUEUE }],
    }

    const transformed = auditPluginPayload(baseConfig as any)(config)

    expect(transformed.jobs?.autoRun).toEqual([
      { cron: '*/5 * * * *', limit: 1, queue: DEFAULT_QUEUE },
    ])
  })

  test('wraps a host autoRun function instead of spreading it', async () => {
    const hostEntry = { cron: '*/5 * * * *', queue: 'default' }
    const hostFn = vi.fn(() => [hostEntry])
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: hostFn as any }

    const transformed = auditPluginPayload(baseConfig as any)(config)
    const payload = { id: 'payload' } as any

    expect(typeof transformed.jobs?.autoRun).toBe('function')
    await expect((transformed.jobs?.autoRun as any)(payload)).resolves.toEqual([
      hostEntry,
      defaultAutoRunEntry,
    ])
    expect(hostFn).toHaveBeenCalledWith(payload)
  })

  // A function form cannot be inspected without calling it, so the plugin appends
  // unconditionally. This pins that behavior; change both if you dedupe in the wrapper.
  test('appends to a host autoRun function even if it already polls the same queue', async () => {
    const hostEntry = { cron: '*/5 * * * *', queue: DEFAULT_QUEUE }
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: () => [hostEntry] }

    const transformed = auditPluginPayload(baseConfig as any)(config)
    const result = await (transformed.jobs?.autoRun as any)({} as any)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(hostEntry)
  })

  test('uses a custom queue and schedule for both the task and autoRun, trimmed', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], {
      cleanup: { queue: '  my-queue  ', schedule: '30 2 * * *' },
    })

    expect(transformed.jobs?.tasks?.[0]).toMatchObject({
      schedule: [{ cron: '30 2 * * *', queue: 'my-queue' }],
    })
    expect(transformed.jobs?.autoRun).toEqual([{ cron: '* * * * *', limit: 10, queue: 'my-queue' }])
  })

  test('uses custom autoRun cron and limit', () => {
    const transformed = applyPlugin([{ slug: 'posts', fields: [] }], {
      cleanup: { autoRun: { cron: '*/2 * * * *', limit: 3 } },
    })

    expect(transformed.jobs?.autoRun).toEqual([
      { cron: '*/2 * * * *', limit: 3, queue: DEFAULT_QUEUE },
    ])
  })

  test('appends an autoRun entry for a different queue than the host', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { autoRun: [{ cron: '* * * * *', queue: 'default' }] }

    const transformed = auditPluginPayload({
      ...baseConfig,
      cleanup: { queue: 'audit-only' },
    } as any)(config)

    expect(transformed.jobs?.autoRun).toHaveLength(2)
    expect((transformed.jobs?.autoRun as any[])[1]).toMatchObject({ queue: 'audit-only' })
  })

  test('preserves other host jobs settings', () => {
    const shouldAutoRun = vi.fn(() => true)
    const jobsCollectionOverrides = ({ defaultJobsCollection }: any) => defaultJobsCollection
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { jobsCollectionOverrides, shouldAutoRun } as any

    const transformed = auditPluginPayload(baseConfig as any)(config)

    expect(transformed.jobs?.shouldAutoRun).toBe(shouldAutoRun)
    expect((transformed.jobs as any).jobsCollectionOverrides).toBe(jobsCollectionOverrides)
  })

  test('throws on a task slug collision', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    config.jobs = { tasks: [{ slug: DEFAULT_TASK_SLUG, handler: vi.fn() }] } as any

    expect(() => auditPluginPayload(baseConfig as any)(config)).toThrow(AuditPluginValidationError)
  })

  test('does not apply the jobs transform when the plugin is disabled', () => {
    const config = createPayloadConfig([{ slug: 'posts', fields: [] }])
    const transformed = auditPluginPayload({ ...baseConfig, state: 'disabled' } as any)(config)

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
    const task = generateCleanupLogsTask(cleanupConfig)

    await (task.handler as any)({ req: { payload: { db: { deleteMany } } } })

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
    const task = generateCleanupLogsTask(mergeConfig(baseConfig as any))
    const result = await (task.handler as any)({
      req: { payload: { db: { deleteMany: vi.fn() } } },
    })

    expect(result).toEqual({ output: {} })
  })

  test('cleanup handler propagates database errors so the job can retry', async () => {
    const task = generateCleanupLogsTask(mergeConfig(baseConfig as any))
    const deleteMany = vi.fn().mockRejectedValue(new Error('db down'))

    await expect(
      (task.handler as any)({ req: { payload: { db: { deleteMany } } } }),
    ).rejects.toThrow('db down')
    expect(task.retries).toBe(2)
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
