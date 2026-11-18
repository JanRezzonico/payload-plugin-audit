import type { CollectionConfig } from 'payload'

export const PostReferencers: CollectionConfig = {
  slug: 'post-referencers',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
    },
  ],
}
