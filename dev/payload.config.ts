import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { auditPluginPayload } from 'payload-plugin-audit'
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
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    auditPluginPayload({
      access: {
        create: ({ req }) => {
          return req.user?.collection === 'users' && req.user.role === 'admin'
        },
        delete: ({ req }) => {
          return req.user?.collection === 'users' && req.user.role === 'admin'
        },
        read: ({ req }) => {
          return (
            req.user?.collection === 'users' && ['admin', 'viewer'].includes(req.user.role || '')
          )
        },
      },
      collections: ['posts', 'media', 'post-referencers'],
      db: {
        collections: {
          logs: {
            // slug: 'the-audit-logs',
            // hidden: true,
          },
        },
        // fields: {
        //   createdBy: {
        //     name: 'myCustomCreatedBy',
        //   },
        //   updateLogs: {
        //     name: 'myCustomUpdateLogs',
        //   },
        // },
      },
      state: 'enabled',
      ui: {
        fields: {
          // createdBy: {
          //   label: 'This entity was created by',
          // },
          // delta: {
          //   component: {
          //     badgeLabels: {
          //       added: 'Addition',
          //       moved: 'Move',
          //       removed: 'Removal',
          //       updated: 'Update',
          //     },
          //   },
          //   rows: {
          //     labels: {
          //       change: 'My custom change number {number}',
          //       fallback: 'My custom fallback',
          //       latestChange: 'My custom latest change',
          //     },
          //   },
          // },
          // entity: {
          //   description: {
          //     beforeCollection: 'The entity is from the collection:                  ',
          //     beforeId: 'The entity id is:                  ',
          //     // separator: '<><><>',
          //   },
          // },
          // updateLogs: {
          //   date: {
          //     // displayFormat: 'HH:mm',
          //     label: 'My custom date label',
          //   },
          //   label: 'This is the update log',
          // },
          // user: {
          //   description: {
          //     beforeCollection: 'The user is from the collection:                  ',
          //     beforeId: 'The user id is:                  ',
          //     // separator: '---',
          //   },
          //   label: 'This is the user we are talking about',
          // },
        },
      },
      userCollections: ['users', 'other-users'],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
