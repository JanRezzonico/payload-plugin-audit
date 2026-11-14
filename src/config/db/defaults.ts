import type { ConfigDb } from './types.js'

const dbDefaults: ConfigDb = {
  collections: {
    logs: {
      slug: 'audit-plugin-logs',
      hidden: false,
    },
  },
  fields: {
    createdBy: {
      name: 'auditPluginCreatedBy',
    },
    updateLogs: {
      name: 'auditPluginUpdateLogs',
    },
  },
}

export { dbDefaults }
