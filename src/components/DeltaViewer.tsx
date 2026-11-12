'use client'

import type { Delta } from 'jsondiffpatch'
import type { Op } from 'jsondiffpatch/formatters/jsonpatch'
import type { ReactNode } from 'react'

import { useField } from '@payloadcms/ui'
import * as jsonpatchFormatter from 'jsondiffpatch/formatters/jsonpatch'
import { useMemo } from 'react'

import './DeltaViewer.css'
import {
  type ChipVariant,
  classifyOp,
  formatPath,
  formatValue,
  getOldValue,
} from './DeltaViewer.utils.js'

type OpKind = 'added' | 'moved' | 'removed' | 'updated'

export type DeltaViewerLabels = Record<OpKind, string>

type KindLabel = {
  text: string
  variant: ChipVariant
}

type KindLabels = Record<OpKind, KindLabel>

function Chip({ children, variant }: { children: ReactNode; variant: ChipVariant }) {
  return (
    <span className="DeltaViewer__chip" data-variant={variant}>
      {children}
    </span>
  )
}

function Arrow() {
  return <span className="DeltaViewer__arrow">⇒</span>
}

function RawJSON({ value }: { value: unknown }) {
  return (
    <details className="DeltaViewer__raw">
      <summary>Raw JSON diff</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  )
}

function OpContent({ kind, oldValue, op }: { kind: OpKind; oldValue: unknown; op: Op }) {
  switch (kind) {
    case 'added':
      return 'value' in op ? <Chip variant="new">{formatValue(op.value)}</Chip> : null

    case 'moved':
      return 'from' in op ? (
        <>
          <Chip variant="neutral">{formatPath(op.from)}</Chip>
          <Arrow />
          <Chip variant="neutral">{formatPath(op.path)}</Chip>
        </>
      ) : null

    case 'removed':
      return oldValue !== undefined ? <Chip variant="old">{formatValue(oldValue)}</Chip> : null

    case 'updated':
      return (
        <>
          {oldValue !== undefined && (
            <>
              <Chip variant="old">{formatValue(oldValue)}</Chip>
              <Arrow />
            </>
          )}
          {'value' in op && <Chip variant="new">{formatValue(op.value)}</Chip>}
        </>
      )
  }
}

function OpRow({ delta, kindLabels, op }: { delta: Delta; kindLabels: KindLabels; op: Op }) {
  const oldValue = op.op === 'replace' ? getOldValue(delta, op.path) : undefined
  const kind = classifyOp(op, oldValue)
  const { text, variant } = kindLabels[kind]

  return (
    <div className="DeltaViewer__op" data-variant={variant}>
      <div className="DeltaViewer__op-title-container">
        <span className="DeltaViewer__op-title-chip" data-variant={variant}>
          {text}
        </span>
        <span className="DeltaViewer__op-title-path">{formatPath(op.path)}</span>
      </div>
      {op.op !== 'remove' && (
        <div className="DeltaViewer__op-content">
          <OpContent kind={kind} oldValue={oldValue} op={op} />
        </div>
      )}
    </div>
  )
}

function Message({ children, value }: { children: ReactNode; value: unknown }) {
  return (
    <div>
      <p>{children}</p>
      <RawJSON value={value} />
    </div>
  )
}

type Props = {
  labels: DeltaViewerLabels
  path: string
}

function DeltaViewer({ labels, path }: Props) {
  const { value } = useField<Delta>({ path })
  const kindLabels: KindLabels = {
    added: { text: labels.added, variant: 'new' },
    moved: { text: labels.moved, variant: 'update' },
    removed: { text: labels.removed, variant: 'old' },
    updated: { text: labels.updated, variant: 'update' },
  }

  const result = useMemo(() => {
    if (!value) {
      return { ops: [] as Op[] }
    }
    try {
      return { ops: jsonpatchFormatter.format(value) ?? [] }
    } catch {
      return { error: true, ops: [] as Op[] }
    }
  }, [value])

  if (result.error) {
    return <Message value={value}>Delta is not valid</Message>
  }

  if (result.ops.length === 0) {
    return <Message value={value}>No changes recorded</Message>
  }

  return (
    <div className="DeltaViewer__container">
      {result.ops.map((op) => (
        <OpRow delta={value} key={`${op.op}:${op.path}`} kindLabels={kindLabels} op={op} />
      ))}
      <RawJSON value={value} />
    </div>
  )
}

export { DeltaViewer }
