'use client'

import type { Delta } from 'jsondiffpatch'
import type { Op } from 'jsondiffpatch/formatters/jsonpatch'
import type { ReactNode } from 'react'

import { CodeEditor, Collapsible, Pill, useField } from '@payloadcms/ui'
import * as jsonpatchFormatter from 'jsondiffpatch/formatters/jsonpatch'
import { useMemo } from 'react'

import './DeltaViewer.css'

import type {
  DeltaViewerChipVariant,
  DeltaViewerKindLabels,
  DeltaViewerLabels,
  DeltaViewerOpKind,
} from './DeltaViewer.types.js'

import { classifyOp, formatPath, formatValue, getOldValue } from './DeltaViewer.utils.js'

function Chip({
  bold,
  children,
  variant,
}: {
  bold?: boolean
  children: ReactNode
  variant: DeltaViewerChipVariant
}) {
  const pillStyleByVariant = {
    neutral: 'light',
    new: 'success',
    old: 'error',
    update: 'warning',
  } as const

  return (
    <Pill pillStyle={pillStyleByVariant[variant]} size="small">
      {bold ? <strong>{children}</strong> : children}
    </Pill>
  )
}

function Arrow() {
  return <span className="DeltaViewer__arrow">⇒</span>
}

function RawJSON({ value }: { value: unknown }) {
  return (
    <Collapsible header="Raw JSON diff" initCollapsed>
      <CodeEditor
        defaultLanguage="json"
        maxHeight={500}
        minHeight={80}
        options={{
          lineNumbers: 'off',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
        }}
        readOnly={true}
        value={value ? JSON.stringify(value, null, 2) : 'undefined'}
      />
    </Collapsible>
  )
}

function OpContent({ kind, oldValue, op }: { kind: DeltaViewerOpKind; oldValue: unknown; op: Op }) {
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

function OpRow({
  delta,
  kindLabels,
  op,
}: {
  delta: Delta
  kindLabels: DeltaViewerKindLabels
  op: Op
}) {
  const oldValue = op.op === 'replace' ? getOldValue(delta, op.path) : undefined
  const kind = classifyOp(op, oldValue)
  const { text, variant } = kindLabels[kind]

  return (
    <div className="DeltaViewer__op" data-variant={variant}>
      <div className="DeltaViewer__op-title-container">
        <Chip bold variant={variant}>
          {text.toUpperCase()}
        </Chip>
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
  const kindLabels: DeltaViewerKindLabels = {
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
