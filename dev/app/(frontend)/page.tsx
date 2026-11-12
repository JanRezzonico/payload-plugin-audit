'use client'

import { useState } from 'react'

const otherCollectionUser = {
  email: 'other-dev@example.local',
  password: 'test',
}

const AUDIT_SLUG = 'audit-plugin-logs'

async function api(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'omit', // ignore the admin cookie, auth via header only
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `JWT ${token}` }),
    },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

export default function Page() {
  const [log, setLog] = useState<string[]>([])
  const push = (label: string, data: unknown) =>
    setLog((l) => [...l, `${label}\n${JSON.stringify(data, null, 2)}`])

  async function run() {
    setLog([])
    try {
      // 1. Real login against the non-admin auth collection
      const { token, user } = await api('/other-users/login', {
        body: JSON.stringify(otherCollectionUser),
        method: 'POST',
      })
      push('login', { id: user.id, collection: user.collection })

      // 2. Create as that user
      const { doc: created } = await api(
        '/posts',
        {
          body: JSON.stringify({
            author: { relationTo: 'other-users', value: user.id },
            title: 'Created by other-users',
          }),
          method: 'POST',
        },
        token,
      )
      push('created', created)

      // 3. Update as that user
      const { doc: updated } = await api(
        `/posts/${created.id}`,
        { body: JSON.stringify({ title: 'Updated by other-users' }), method: 'PATCH' },
        token,
      )
      push('updated', updated)

      // 4. Check the audit entries (needs read access on the audit collection)
      const audit = await api(`/${AUDIT_SLUG}?sort=-createdAt&limit=2&depth=0`, {}, token)
      push('audit entries (expect actor.relationTo = "other-users")', audit.docs)
    } catch (e) {
      push('error', String(e))
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <button onClick={run} type="button">
        Run other-users flow
      </button>
      <pre>{log.join('\n\n')}</pre>
    </main>
  )
}
