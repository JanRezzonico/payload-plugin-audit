import type { ConfigAccess } from './types.js'

const accessDefaults: ConfigAccess = {
  delete: ({ req: _req }) => false, // By default, no user can delete logs manually
  read: ({ req }) => Boolean(req.user), // By default, only authenticated users can read logs
}

export { accessDefaults }
