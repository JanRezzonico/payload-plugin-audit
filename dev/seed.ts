import type { Payload } from 'payload'

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: adminUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: adminUser,
    })
    await payload.create({
      collection: 'users',
      data: viewerUser,
    })
    await payload.create({
      collection: 'users',
      data: normalUser,
    })

    await payload.create({
      collection: 'other-users',
      data: otherCollectionUser,
    })
  }
}

const adminUser = {
  email: 'admin-dev@example.local',
  password: 'test',
  role: 'admin' as const,
}

const viewerUser = {
  email: 'viewer-dev@example.local',
  password: 'test',
  role: 'viewer' as const,
}

const normalUser = {
  email: 'normal-dev@example.local',
  password: 'test',
  role: 'normal' as const,
}

const otherCollectionUser = {
  email: 'other-dev@example.local',
  password: 'test',
  role: 'admin' as const,
}
