import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { auditPluginPayload } from 'audit-plugin-payload'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media.js'
import { OtherUsers } from './collections/OtherUsers.js'
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
  collections: [Posts, Media, Users, OtherUsers],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: true,
  }),
  editor: lexicalEditor(),
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    auditPluginPayload({
      canManageAudits: ({ req }) => req.user?.role === 'admin',
      canSeeAudits: ({ req }) => ['admin', 'viewer'].includes(req.user?.role || ''),
      customizeFields: {
        deltaViewerLabels: {
          added: 'My Custom Added',
          moved: 'My Custom Moved',
          // removed: 'My Custom Removed',
          updated: 'My Custom Updated',
        },
        updateDelta: {
          rowLabels: {
            changeNumber: 'My Custom Change ({number}), yes its {number}',
            genericChange: 'My Custom Change',
            latestChange: 'My Custom Latest Change ({number})',
          },
        },
        userDescriptionLabels: {
          collectionSlugPrefix: 'The user is from the collection:',
          userIdPrefix: 'The user has the id:',
        },
      },
      enabledCollections: ['media', 'posts'],
      userCollections: ['users', 'other-users'],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
