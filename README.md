# Audit Plugin for Payload CMS

`audit-plugin-payload` adds audit history to selected [Payload CMS](https://payloadcms.com) collections.

## What it does

- Records who created or updated a document.
- Stores create and update events in the `audit-plugin-logs` collection.
- Calculates and stores the changed fields for update events.
- Adds read-only virtual fields for the creating user and update history.
- Provides a delta viewer for inspecting update changes in the Payload admin panel.
- Lets you control who can view or manage audit records.
- Supports hiding the logs collection from the admin navigation.

## Installation

```bash
# Using pnpm
pnpm add audit-plugin-payload

# Using npm
npm install audit-plugin-payload

# Using yarn
yarn add audit-plugin-payload
```

## Basic usage

Add the plugin to `payload.config.ts`.

```ts
import { auditPluginPayload } from 'audit-plugin-payload'

export default buildConfig({
  collections: [Users, Posts, Media],
  plugins: [
    auditPluginPayload({
      access: {
        manage: ({ req }) => req.user?.role === 'admin',
        read: ({ req }) => ['admin', 'viewer'].includes(req.user?.role || ''),
      },
      collections: ['posts', 'media'],
      userCollection: 'users',
    }),
  ],
})
```

The plugin adds the audit hooks and virtual fields only to collections listed in `collections`. Audit entries are created when a logged-in user creates or updates a document.

## Options

- `collections`: Collection slugs to audit. At least one collection is required.
- `userCollection`: Collection slug of the users collection.
- `access`: Object with `manage` and `read` properties, each being a Payload access control function.
- `disabled`: Set to `true` to disable the plugin.
- `logsCollectionHidden`: Hide `audit-plugin-logs` from the admin panel for everyone or with granular access control.
- `custom`: Customize labels, date formatting, and other options for fields added by the plugin.