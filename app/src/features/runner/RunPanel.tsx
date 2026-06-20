import { useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import type { TerminalLine } from '@/lib/ydoc'
import { useRunner }              from '@/hooks/useRunner'
import { getPistonRuntime, isExecutionConfigured } from '@/lib/piston'
import { LANGUAGE_LABELS }        from '@/features/editor/languageMap'

interface Props {
  yTerminal:  Y.Array<TerminalLine> | null
  language:   string
  code:       string
  userName?:  string
  running:    boolean
  onRun:      () => void
}

export default function RunPanel({ yTerminal, language, code, userName = 'You', running, onRun }: Props) {
  const { clear }         = useRunner(yTerminal)
  const [lines, setLines]   = useState<TerminalLine[]>([])
  const [stdin, setStdin]   = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)

  const runtime      = getPistonRuntime(language)
  const isConfigured = isExecutionConfigured()

  // Subscribe to shared Y.Array — all peers see the same output
  useEffect(() => {
    if (!yTerminal) return
    const refresh = () => setLines(yTerminal.toArray())
    yTerminal.observe(refresh)
    refresh()
    return () => yTerminal.unobserve(refresh)
  }, [yTerminal])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Terminal</span>

        {/* Language badge */}
        <span className="badge" style={{ fontSize: 10 }}>
          {LANGUAGE_LABELS[language] ?? language}
        </span>

        {/* Version badge */}
        {runtime && (
          <span className="badge" style={{ fontSize: 10, opacity: 0.7 }}>
            {runtime.version}
          </span>
        )}

        {/* Unsupported warning */}
        {!runtime && (
          <span className="badge badge-yellow" style={{ fontSize: 10 }}>
            Can't execute {LANGUAGE_LABELS[language] ?? language}
          </span>
        )}

        {/* Not configured warning */}
        {!isConfigured && (
          <span className="badge badge-yellow" style={{ fontSize: 10 }}>
            Add VITE_JUDGE0_KEY to .env
          </span>
        )}

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => setShowStdin(s => !s)}
          title="Toggle stdin input"
        >⌨</button>

        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={clear}
          title="Clear terminal"
        >⊠</button>

        <button
          className={`btn btn-sm ${running ? 'btn-secondary' : 'btn-primary'}`}
          onClick={onRun}
          disabled={running || !runtime || !isConfigured}
          id="run-in-panel-btn"
        >
          {running
            ? <><span className="spin">⟳</span> Running</>
            : '▶ Run'
          }
        </button>
      </div>

      {/* Stdin */}
      {showStdin && (
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder="stdin (optional)…"
            style={{
              width: '100%', height: 52, resize: 'none',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', color: 'var(--text)',
              fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 8px',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Output */}
      <div className="terminal-output">
        {lines.length === 0 && (
          <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            {!isConfigured
              ? <>Add <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>VITE_JUDGE0_KEY</code> to your .env — get a free key at <strong>rapidapi.com → Judge0 CE</strong></>            
              : !runtime
              ? `${LANGUAGE_LABELS[language] ?? language} can't be executed — try Python, JavaScript, Java, C++, Go, Rust, and more.`
              : 'Click ▶ Run to execute. Output is shared with all collaborators in real time.'
            }
          </div>
        )}

        {lines.map((line, i) => (
          <div key={i} className={`terminal-line ${line.type}`}>
            <span className="terminal-meta">
              {new Date(line.time).toLocaleTimeString('en-US', {
                hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
