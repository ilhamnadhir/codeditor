import { useState } from 'react'
import { useAI, type AITask } from '@/hooks/useAI'
import type { FileEntry } from '@/hooks/useFiles'
import * as Y from 'yjs'

interface Props {
  activeCode:  string
  activeFile:  string | null
  files:       FileEntry[]
  yFiles:      Y.Map<Y.Text> | null
}

const TABS: { id: AITask; label: string; icon: string; desc: string }[] = [
  { id: 'explain',      label: 'Explain',      icon: '💡', desc: 'What does this code do?' },
  { id: 'bugs',         label: 'Bug Detect',   icon: '🐛', desc: 'Find issues and vulnerabilities' },
  { id: 'review',       label: 'Review',       icon: '✅', desc: 'Structured code review' },
  { id: 'complexity',   label: 'Complexity',   icon: '📊', desc: 'Time/space complexity analysis' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️', desc: 'Full codebase dependency analysis' },
]

/** Convert markdown-ish AI response to HTML for display */
function renderResponse(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<strong style="font-size:13px;color:var(--text)">$1</strong>')
    .replace(/^[\-•] (.+)$/gm, '<div style="padding-left:12px">· $1</div>')
    .replace(/\n/g, '<br/>')
}

export default function AIPanel({ activeCode, activeFile, files, yFiles }: Props) {
  const { loading, response, error, isConfigured, analyze, clear } = useAI()
  const [activeTab, setActiveTab] = useState<AITask>('explain')

  const getAllFiles = (): Record<string, string> | undefined => {
    if (!yFiles || files.length === 0) return undefined
    const result: Record<string, string> = {}
    files.forEach(f => {
      const text = yFiles.get(f.name)
      if (text) result[f.name] = text.toString()
    })
    return result
  }

  const handleAnalyze = () => {
    const allFiles = activeTab === 'architecture' ? getAllFiles() : undefined
    analyze(activeTab, activeCode, allFiles)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Tabs */}
      <div className="panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); clear() }}
            title={tab.desc}
            id={`ai-tab-${tab.id}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {activeTab === 'architecture'
            ? `Analyzing ${files.length} file${files.length !== 1 ? 's' : ''}`
            : `Analyzing: ${activeFile ?? 'open file'}`
          }
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm w-full"
            onClick={handleAnalyze}
            disabled={loading || !activeCode.trim()}
            id={`ai-run-${activeTab}`}
          >
            {loading
              ? <><span className="spin">⟳</span> Analyzing…</>
              : <>{TABS.find(t => t.id === activeTab)?.icon} Analyze</>
            }
          </button>
          {response && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={clear} title="Clear">✕</button>
          )}
        </div>

        {!isConfigured && (
          <div style={{
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--yellow-dim)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 'var(--r)',
            fontSize: 11,
            color: 'var(--yellow)',
            lineHeight: 1.5,
          }}>
            ⚠ Add <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_GEMINI_KEY</code> to <code style={{ fontFamily: 'var(--font-mono)' }}>.env</code> to enable AI features.
          </div>
        )}
      </div>

      {/* Response area */}
      <div className="panel-body">
        {error && (
          <div style={{
            padding: '10px 12px',
            background: 'var(--red-dim)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--r)',
            fontSize: 12,
            color: 'var(--red)',
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {loading && !response && (
          <div className="ai-thinking">
            <span>Analyzing</span>
            <span className="ai-thinking-dots">
              <span /><span /><span />
            </span>
          </div>
        )}

        {response ? (
          <div
            className="ai-response"
            dangerouslySetInnerHTML={{ __html: renderResponse(response) }}
          />
        ) : !loading && !error && (
          <div className="ai-empty">
            <span className="ai-empty-icon">
              {TABS.find(t => t.id === activeTab)?.icon}
            </span>
            <div style={{ fontSize: 12, fontWeight: 500 }}>
              {TABS.find(t => t.id === activeTab)?.desc}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              Click "Analyze" to get started
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
