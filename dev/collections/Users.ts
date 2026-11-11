import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      access: {
        create: ({ req: { user } }) => user?.role === 'admin',
        read: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => user?.role === 'admin',
      },
      defaultValue: 'normal',
      options: ['admin', 'normal'],
      required: true,
    },
  ],
}
