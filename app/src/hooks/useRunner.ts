import { useState, useCallback, useRef } from 'react'
import type * as Y from 'yjs'
import { executeCode } from '@/lib/piston'
import type { TerminalLine } from '@/lib/ydoc'

interface UseRunnerReturn {
  running: boolean
  run:     (monacoLanguage: string, code: string, stdin?: string, userName?: string) => Promise<void>
  clear:   () => void
}

/**
 * Code execution hook.
 * Calls the Piston API and writes all output to a shared Y.Array<TerminalLine>
 * so every collaborator sees the same terminal output in real time.
 */
export function useRunner(yTerminal: Y.Array<TerminalLine> | null): UseRunnerReturn {
  const [running, setRunning] = useState(false)
  const runIdRef = useRef(0)

  const run = useCallback(async (
    monacoLanguage: string,
    code:           string,
    stdin          = '',
    userName       = 'You',
  ) => {
    if (running || !yTerminal) return

    setRunning(true)
    runIdRef.current += 1
    const runId = String(runIdRef.current)

    const push = (type: TerminalLine['type'], text: string) => {
      yTerminal.push([{ type, text, time: Date.now(), runId, user: userName }])
    }

    push('info', `▶  ${userName} · ${monacoLanguage} · ${new Date().toLocaleTimeString()}`)

    try {
      const result = await executeCode(monacoLanguage, code, stdin)

      if (result.stdout.trim()) {
        result.stdout.trimEnd().split('\n').forEach(line => push('stdout', line))
      }

      if (result.stderr.trim()) {
        result.stderr.trimEnd().split('\n').forEach(line => push('stderr', line))
      }

      push(
        result.exitCode === 0 ? 'success' : 'stderr',
        `─── exit ${result.exitCode}  ·  ${result.language} ${result.version} ───`,
      )
    } catch (err) {
      push('stderr', `Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }, [running, yTerminal])

  const clear = useCallback(() => {
    if (!yTerminal) return
    yTerminal.delete(0, yTerminal.length)
  }, [yTerminal])

  return { running, run, clear }
}
