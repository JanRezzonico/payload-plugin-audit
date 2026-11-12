import type { CollectionConfig } from 'payload'

export const OtherUsers: CollectionConfig = {
  slug: 'other-users',
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
      defaultValue: 'admin',
      options: ['admin', 'someOtherRole'],
      required: true,
    },
  ],
}
