import { deepMergeWithSourceArrays } from 'payload'
import { AuditPluginValidationError } from 'src/utils/AuditPluginValidationError.js'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { uiDefaults } from './defaults.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateUi = (incomingConfig: IncomingPluginConfig['ui']): PluginConfig['ui'] => {
  const merged: PluginConfig['ui'] = deepMergeWithSourceArrays(uiDefaults, incomingConfig ?? {})

  merged.fields.user.description.beforeCollection =
    merged.fields.user.description.beforeCollection.trim() + ' '

  merged.fields.user.description.beforeUserId =
    merged.fields.user.description.beforeUserId.trim() + ' '

  const hasInvalidColor = Object.values(merged.fields.delta.component.colors).some((group) =>
    Object.values(group).some((value) => !isHexColor(value)),
  )

  if (hasInvalidColor) {
    throw new AuditPluginValidationError(
      `Invalid color value in custom UI configuration.
      All colors must be valid hex color strings (case insensitive).
      (Example: #ff0000 or #f00)`,
    )
  }

  return merged
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const isHexColor = (color: string): boolean => HEX_COLOR_REGEX.test(color)

export { validateUi }
