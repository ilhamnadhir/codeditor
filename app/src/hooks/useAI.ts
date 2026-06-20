import { useState, useCallback } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type AITask =
  | 'explain'
  | 'bugs'
  | 'review'
  | 'complexity'
  | 'architecture'

interface UseAIReturn {
  loading:   boolean
  response:  string
  error:     string | null
  isConfigured: boolean
  analyze:   (task: AITask, code: string, allFiles?: Record<string, string>) => Promise<void>
  clear:     () => void
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY as string | undefined

function buildPrompt(task: AITask, code: string, allFiles?: Record<string, string>): string {
  switch (task) {
    case 'explain':
      return `Explain this code clearly and concisely. Focus on what it does, not how:\n\n\`\`\`\n${code}\n\`\`\``

    case 'bugs':
      return `Analyze this code for bugs, potential issues, edge cases, and security problems. List each issue with the approximate line number and severity (critical/warning/info):\n\n\`\`\`\n${code}\n\`\`\``

    case 'review':
      return `Provide a structured code review. Cover: (1) Correctness, (2) Readability, (3) Performance, (4) Edge cases, (5) Suggestions. Be specific:\n\n\`\`\`\n${code}\n\`\`\``

    case 'complexity':
      return `Analyze the time and space complexity of this code. For each function/block, give Big-O notation with reasoning. Identify the most expensive operations:\n\n\`\`\`\n${code}\n\`\`\``

    case 'architecture': {
      const filesSummary = allFiles
        ? Object.entries(allFiles)
            .map(([name, content]) => `### ${name}\n\`\`\`\n${content.slice(0, 800)}\n\`\`\``)
            .join('\n\n')
        : `\`\`\`\n${code}\n\`\`\``

      return `Analyze this codebase's architecture. Provide:
1. **Module Dependencies** — which files/modules depend on each other
2. **Complexity Hotspots** — files/functions that are doing too much
3. **Design Patterns** — patterns you can identify
4. **Improvement Suggestions** — concrete refactoring recommendations

Files:\n\n${filesSummary}`
    }
  }
}

export function useAI(): UseAIReturn {
  const [loading,  setLoading]  = useState(false)
  const [response, setResponse] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const isConfigured = Boolean(GEMINI_KEY)

  const analyze = useCallback(async (
    task:     AITask,
    code:     string,
    allFiles?: Record<string, string>,
  ) => {
    if (!isConfigured) {
      setError('Add VITE_GEMINI_KEY to your .env to enable AI features.')
      return
    }

    if (!code.trim()) {
      setError('No code selected. Select some code or open a file first.')
      return
    }

    setLoading(true)
    setResponse('')
    setError(null)

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY!)
      // Wait, let's use gemini-1.5-flash which is the standard fast model
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = buildPrompt(task, code, allFiles)
      const stream = await model.generateContentStream(prompt)

      for await (const chunk of stream.stream) {
        const text = chunk.text()
        setResponse(prev => prev + text)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading(false)
    }
  }, [isConfigured])

  const clear = useCallback(() => {
    setResponse('')
    setError(null)
  }, [])

  return { loading, response, error, isConfigured, analyze, clear }
}
