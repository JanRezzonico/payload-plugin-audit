/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionBeforeChangeHook, Config } from 'payload'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { isPluginEnabled, preparePluginConfig } from '../src/config/index.js'
import { auditPluginPayload } from '../src/index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const canAccessAudits = ({ req: { user } }: { req: { user?: { role?: string } | null } }) =>
  user?.role === 'admin'

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
  canAccessAudits,
  collectionConfigs: {
    posts: {
      createdByEnabled: true,
      updateDeltaEnabled: true,
    },
  },
  userCollection: 'users',
} as const

type HookArgs = Parameters<CollectionBeforeChangeHook>[0]
type Doc = Record<string, any>

const findCollection = (config: Config, slug: string) =>
  config.collections?.find((collection) => collection.slug === slug)

/**
 * Runs every beforeChange hook on the collection in order, the way Payload does.
 * Tests assert on behavior, not on hook position, and the single cast lives here.
 */
const runBeforeChange = async (
  config: Config,
  args: {
    data?: Doc
    operation: 'create' | 'update'
    originalDoc?: Doc
    slug?: string
    user?: { id: string } | null
  },
): Promise<Doc> => {
  const collection = findCollection(config, args.slug ?? 'posts')
  const hooks = collection?.hooks?.beforeChange ?? []

  let data: Doc = args.data ?? {}
  for (const hook of hooks) {
    const result = await hook({
      collection,
      data,
      operation: args.operation,
      originalDoc: args.originalDoc,
      req: { user: args.user === undefined ? { id: 'user-1' } : args.user },
    } as unknown as HookArgs)
    data = (result ?? data) as Doc
  }
  return data
}

const applyPlugin = (
  collections: NonNullable<Config['collections']>,
  overrides: Record<string, unknown> = {},
) => {
  const config = createConfig(collections)
  auditPluginPayload({ ...basePluginConfig, ...overrides } as any)(config)
  return config
}

// ---------------------------------------------------------------------------
// Config transform
// ---------------------------------------------------------------------------

describe('auditPluginPayload config transform', () => {
  test('leaves the config unchanged when the plugin is disabled', () => {
    const config = createConfig([{ slug: 'posts', fields: [] }])

    const result = auditPluginPayload({ ...basePluginConfig, disabled: true })(config)

    expect(result).toBe(config)
    expect(config.collections?.[0]?.fields).toHaveLength(0)
    expect(config.collections?.[0]?.hooks).toBeUndefined()
  })

  test('adds audit fields and hooks only to configured collections', () => {
    const existingHook = () => undefined
    const config = applyPlugin(
      [
        { slug: 'posts', fields: [], hooks: { beforeChange: [existingHook] } },
        { slug: 'media', fields: [] },
        { slug: 'pages', fields: [] },
      ],
      {
        collectionConfigs: {
          media: { createdByEnabled: false, updateDeltaEnabled: false },
          posts: { createdByEnabled: true, updateDeltaEnabled: true },
        },
      },
    )

    const posts = findCollection(config, 'posts')
    const media = findCollection(config, 'media')
    const pages = findCollection(config, 'pages')

    expect(posts?.fields.map((field) => 'name' in field && field.name)).toEqual([
      'createdBy',
      'updateDelta',
    ])
    expect(posts?.hooks?.beforeChange).toHaveLength(3)
    expect(posts?.hooks?.beforeChange?.[0]).toBe(existingHook)
    expect(media?.fields).toEqual([])
    expect(media?.hooks).toBeUndefined()
    expect(pages?.fields).toEqual([])
    expect(pages?.hooks).toBeUndefined()
  })

  test('only adds the fields that are enabled', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      collectionConfigs: { posts: { createdByEnabled: true, updateDeltaEnabled: false } },
    })

    const names = findCollection(config, 'posts')?.fields.map(
      (field) => 'name' in field && field.name,
    )
    expect(names).toEqual(['createdBy'])
  })

  test('preserves fields the collection already had', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [{ name: 'title', type: 'text' }] }])

    const names = findCollection(config, 'posts')?.fields.map(
      (field) => 'name' in field && field.name,
    )
    expect(names?.[0]).toBe('title')
    expect(names).toEqual(expect.arrayContaining(['createdBy', 'updateDelta']))
  })

  test('applies partial field customization while retaining defaults', () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }], {
      customizeFields: {
        createdBy: { label: 'Author' },
        updateDelta: {
          date: { label: 'When' },
          labels: { singular: 'Revision' },
        },
      },
    })

    const fields = config.collections?.[0]?.fields ?? []
    const createdBy = fields.find((field) => 'name' in field && field.name === 'createdBy')
    const updateDelta = fields.find((field) => 'name' in field && field.name === 'updateDelta')

    expect(createdBy).toMatchObject({ label: 'Author' })
    expect(updateDelta).toMatchObject({
      fields: [
        { name: 'user', label: 'User' },
        { name: 'date', label: 'When' },
        { name: 'delta', label: 'Delta' },
      ],
      label: 'Changes',
      labels: { plural: 'Changes', singular: 'Revision' },
    })
  })

  test('does not mutate the options it is given', () => {
    const options = deepFreeze({
      ...basePluginConfig,
      collectionConfigs: { posts: { createdByEnabled: true, updateDeltaEnabled: true } },
      customizeFields: { createdBy: { label: 'Author' } },
    })
    const config = createConfig([{ slug: 'posts', fields: [] }])

    // Frozen options throw on mutation (ESM is strict mode)
    expect(() => auditPluginPayload(options as any)(config)).not.toThrow()
  })

  test('applying the plugin to two configs does not share field objects', () => {
    const first = applyPlugin([{ slug: 'posts', fields: [] }])
    const second = applyPlugin([{ slug: 'posts', fields: [] }])

    const firstFields = findCollection(first, 'posts')?.fields ?? []
    const secondFields = findCollection(second, 'posts')?.fields ?? []

    firstFields.forEach((field, i) => {
      expect(field).not.toBe(secondFields[i])
    })
  })
})

// ---------------------------------------------------------------------------
// Plugin options
// ---------------------------------------------------------------------------

describe('plugin option helpers', () => {
  test('only enables the plugin for active collections', () => {
    expect(isPluginEnabled(basePluginConfig)).toBe(true)
    expect(isPluginEnabled({ ...basePluginConfig, disabled: true })).toBe(false)
    expect(isPluginEnabled({ ...basePluginConfig, collectionConfigs: {} })).toBe(false)
  })

  test('prepares stable field names and merged customization', () => {
    const prepared = preparePluginConfig({
      ...basePluginConfig,
      customizeFields: { updateDelta: { delta: { label: 'Diff' } } },
    })

    expect(prepared).toMatchObject({
      createdByName: 'createdBy',
      customizeFields: {
        updateDelta: {
          date: { label: 'Date' },
          delta: { label: 'Diff' },
        },
      },
      disabled: false,
      updateDeltaName: 'updateDelta',
    })
  })
})

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

describe('createdBy hook', () => {
  const makeConfig = () =>
    applyPlugin([{ slug: 'posts', fields: [] }], {
      collectionConfigs: { posts: { createdByEnabled: true, updateDeltaEnabled: false } },
    })

  test('records the creating user', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'Post' },
      operation: 'create',
      user: { id: 'user-1' },
    })

    expect(result).toMatchObject({ createdBy: 'user-1', title: 'Post' })
  })

  test('does not throw when there is no user (seeding / local API)', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'Post' },
      operation: 'create',
      user: null,
    })

    expect(result.title).toBe('Post')
    expect(result.createdBy ?? null).toBeNull()
  })

  test('does not overwrite createdBy on update', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'After' },
      operation: 'update',
      originalDoc: { id: 'post-1', createdBy: 'user-1', title: 'Before' },
      user: { id: 'user-2' },
    })

    expect(result.createdBy).not.toBe('user-2')
  })
})

describe('updateDelta hook', () => {
  const NOW = new Date('2024-01-02T03:04:05.000Z')

  const makeConfig = () =>
    applyPlugin([{ slug: 'posts', fields: [] }], {
      collectionConfigs: { posts: { createdByEnabled: false, updateDeltaEnabled: true } },
    })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('appends a delta record for updates without diffing the document id', async () => {
    const originalDoc = {
      id: 'post-1',
      title: 'Before',
      updateDelta: [{ date: 'yesterday', delta: { title: ['Old', 'Before'] }, user: 'user-0' }],
    }

    const result = await runBeforeChange(makeConfig(), {
      data: { id: 'post-1', title: 'After' },
      operation: 'update',
      originalDoc,
      user: { id: 'user-1' },
    })

    expect(result.updateDelta).toHaveLength(2)
    expect(result.updateDelta[0]).toEqual(originalDoc.updateDelta[0])
    expect(result.updateDelta[1]).toMatchObject({
      delta: { title: ['Before', 'After'] },
      user: 'user-1',
    })
    expect(result.updateDelta[1].delta).not.toHaveProperty('id')
  })

  test('stamps the new entry with the current time', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'After' },
      operation: 'update',
      originalDoc: { id: 'post-1', title: 'Before' },
    })

    const entry = result.updateDelta.at(-1)
    expect(new Date(entry.date).toISOString()).toBe(NOW.toISOString())
  })

  test('starts a history when the original doc has no updateDelta yet', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'After' },
      operation: 'update',
      originalDoc: { id: 'post-1', title: 'Before' },
    })

    expect(result.updateDelta).toHaveLength(1)
    expect(result.updateDelta[0]).toMatchObject({
      delta: { title: ['Before', 'After'] },
      user: 'user-1',
    })
  })

  test('does not append an empty delta when nothing changed', async () => {
    const originalDoc = { id: 'post-1', title: 'Same', updateDelta: [] }

    const result = await runBeforeChange(makeConfig(), {
      data: { id: 'post-1', title: 'Same' },
      operation: 'update',
      originalDoc,
    })

    expect(result.updateDelta ?? []).toHaveLength(0)
  })

  test('records changes inside nested objects and arrays', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { id: 'post-1', meta: { tags: ['a', 'c'] } },
      operation: 'update',
      originalDoc: { id: 'post-1', meta: { tags: ['a', 'b'] } },
    })

    const entry = result.updateDelta.at(-1)
    expect(entry.delta).toHaveProperty('meta')
    expect(JSON.stringify(entry.delta.meta)).toContain('c')
  })

  test('does not add a delta on create', async () => {
    const result = await runBeforeChange(makeConfig(), {
      data: { title: 'New' },
      operation: 'create',
    })

    expect(result.updateDelta ?? []).toHaveLength(0)
  })

  test('does not mutate originalDoc', async () => {
    const originalDoc = deepFreeze({
      id: 'post-1',
      title: 'Before',
      updateDelta: [{ date: 'yesterday', delta: { title: ['Old', 'Before'] }, user: 'user-0' }],
    })
    const snapshot = structuredClone(originalDoc)

    await runBeforeChange(makeConfig(), {
      data: { id: 'post-1', title: 'After' },
      operation: 'update',
      originalDoc,
    })

    expect(originalDoc).toEqual(snapshot)
  })
})

describe('both hooks together', () => {
  test('createdBy on create and updateDelta on update work from one config', async () => {
    const config = applyPlugin([{ slug: 'posts', fields: [] }])

    const created = await runBeforeChange(config, {
      data: { title: 'v1' },
      operation: 'create',
      user: { id: 'user-1' },
    })
    expect(created.createdBy).toBe('user-1')

    const updated = await runBeforeChange(config, {
      data: { title: 'v2' },
      operation: 'update',
      originalDoc: { id: 'post-1', createdBy: 'user-1', title: 'v1' },
      user: { id: 'user-2' },
    })
    expect(updated.updateDelta).toHaveLength(1)
    expect(updated.updateDelta[0].user).toBe('user-2')
  })
})
