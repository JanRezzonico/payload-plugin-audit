import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { AUDIT_PLUGIN_QUEUE, auditPluginPayload } from 'payload-plugin-audit'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media.js'
import { OtherUsers } from './collections/OtherUsers.js'
import { PostReferencers } from './collections/PostReferencers.js'
import { Posts } from './collections/Posts.js'
import { Users } from './collections/Users.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.js'),
    },
  },
  collections: [Posts, Media, Users, OtherUsers, PostReferencers],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: true,
  }),
  editor: lexicalEditor(),
  jobs: {
    autoRun: [{ cron: '* * * * *', queue: AUDIT_PLUGIN_QUEUE }],
  },
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    auditPluginPayload({
      access: {
        delete: ({ req }) => {
          return req.user?.collection === 'users' && req.user.role === 'admin'
        },
        read: ({ req }) => {
          return (
            req.user?.collection === 'users' && ['admin', 'viewer'].includes(req.user.role || '')
          )
        },
      },
      cleanup: {
        enabled: true,
        olderThanDays: 1,
        schedule: '* * * * *',
      },
      collections: ['posts', 'media', 'post-referencers'],
      state: 'enabled',
      userCollections: ['users', 'other-users'],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
