import type { Delta } from 'jsondiffpatch'
import type { Op } from 'jsondiffpatch/formatters/jsonpatch'

export type ChipVariant = 'neutral' | 'new' | 'old' | 'update'

export const OP_LABELS: Record<string, { text: string; variant: ChipVariant }> = {
  add: { text: 'Added', variant: 'new' },
  move: { text: 'Moved', variant: 'update' },
  remove: { text: 'Removed', variant: 'old' },
  replace: { text: 'Updated', variant: 'update' },
}

export const FALLBACK_LABEL: { text: string; variant: ChipVariant } = {
  text: 'Changed',
  variant: 'neutral',
}

/**
 * Splits a JSON Pointer into unescaped segments.
 * */
export function parsePointer(pointer: string): string[] {
  return pointer
    .replace(/^\//, '')
    .split('/')
    .map((seg) => seg.replaceAll('~1', '/').replaceAll('~0', '~'))
}

export function formatPath(pointer: string): string {
  return parsePointer(pointer).join('.')
}

export function formatValue(value: unknown): string {
  return JSON.stringify(value) ?? 'undefined'
}

/**
 * Gets the old value from a JSON diff at a given pointer.
 * jsondiffpatch encodes a modification as `[oldValue, newValue]`.
 * */
export function getOldValue(delta: Delta, pointer: string): unknown {
  let node: unknown = delta
  for (const seg of parsePointer(pointer)) {
    if (node == null || typeof node !== 'object') {
      return undefined
    }
    node = (node as Record<string, unknown>)[seg]
  }
  return Array.isArray(node) && node.length === 2 ? node[0] : undefined
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string') {
    return value === ''
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0
  }
  return false // false, 0 and NaN are real values
}

export type OpKind = 'added' | 'moved' | 'removed' | 'updated'

export function classifyOp(op: Op, oldValue: unknown): OpKind {
  switch (op.op) {
    case 'add':
      return 'added'
    case 'move':
      return 'moved'
    case 'remove':
      return 'removed'
    case 'replace': {
      const wasEmpty = isEmptyValue(oldValue)
      const isEmpty = isEmptyValue(op.value)
      if (wasEmpty && !isEmpty) {
        return 'added'
      }
      if (!wasEmpty && isEmpty) {
        return 'removed'
      }
      return 'updated'
    }
    default:
      return 'updated'
  }
}
