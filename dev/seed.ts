import type { Payload } from 'payload'

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
    await payload.create({
      collection: 'users',
      data: normalUser,
    })
  }
}

const devUser = {
  email: 'admin-dev@example.local',
  password: 'test',
  role: 'admin' as const,
}

const normalUser = {
  email: 'normal-dev@example.local',
  password: 'test',
  role: 'normal' as const,
}
