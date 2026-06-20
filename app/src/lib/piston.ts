/**
 * Judge0 CE code execution client.
 *
 * Free tier via RapidAPI: https://rapidapi.com/judge0-official/api/judge0-ce
 * Steps to get a key:
 *   1. Sign up at rapidapi.com (free)
 *   2. Subscribe to "Judge0 CE" (free tier: 50 req/day, 200 req/day on basic)
 *   3. Copy your X-RapidAPI-Key and paste it in .env as VITE_JUDGE0_KEY
 *
 * Language IDs sourced from: https://ce.judge0.com/languages (live endpoint)
 */

const JUDGE0_BASE = 'https://judge0-ce.p.rapidapi.com'
const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com'
const JUDGE0_KEY  = import.meta.env.VITE_JUDGE0_KEY as string | undefined

export interface ExecuteResult {
  stdout:   string
  stderr:   string
  exitCode: number
  language: string
  version:  string
}

/**
 * Monaco language ID → Judge0 language ID + display info.
 * Using newest stable versions available on Judge0 CE.
 */
export const JUDGE0_LANGUAGES: Record<string, { id: number; name: string }> = {
  javascript:      { id: 102, name: 'JavaScript (Node.js 22)'  },
  typescript:      { id: 101, name: 'TypeScript (5.6.2)'       },
  javascriptreact: { id: 102, name: 'JavaScript (Node.js 22)'  },
  typescriptreact: { id: 101, name: 'TypeScript (5.6.2)'       },
  python:          { id: 109, name: 'Python (3.13.2)'           },
  java:            { id: 91,  name: 'Java (JDK 17)'             },
  cpp:             { id: 105, name: 'C++ (GCC 14.1.0)'          },
  c:               { id: 103, name: 'C (GCC 14.1.0)'            },
  csharp:          { id: 51,  name: 'C# (Mono 6.6.0)'           },
  go:              { id: 107, name: 'Go (1.23.5)'               },
  rust:            { id: 108, name: 'Rust (1.85.0)'             },
  ruby:            { id: 72,  name: 'Ruby (2.7.0)'              },
  kotlin:          { id: 111, name: 'Kotlin (2.1.10)'           },
  swift:           { id: 83,  name: 'Swift (5.2.3)'             },
  php:             { id: 98,  name: 'PHP (8.3.11)'              },
  scala:           { id: 112, name: 'Scala (3.4.2)'             },
  shell:           { id: 46,  name: 'Bash (5.0.0)'              },
  bash:            { id: 46,  name: 'Bash (5.0.0)'              },
  r:               { id: 99,  name: 'R (4.4.1)'                 },
  lua:             { id: 64,  name: 'Lua (5.3.5)'               },
  perl:            { id: 85,  name: 'Perl (5.28.1)'             },
  dart:            { id: 90,  name: 'Dart (2.19.2)'             },
  clojure:         { id: 86,  name: 'Clojure (1.10.1)'          },
  pascal:          { id: 67,  name: 'Pascal (FPC 3.0.4)'        },
  haskell:         { id: 61,  name: 'Haskell (GHC 8.8.1)'      },
  elixir:          { id: 57,  name: 'Elixir (1.9.4)'            },
  erlang:          { id: 58,  name: 'Erlang (OTP 22.2)'         },
  sql:             { id: 82,  name: 'SQL (SQLite 3.27.2)'        },
  plaintext:       { id: 43,  name: 'Plain Text'                 },
}

export function getPistonRuntime(monacoLanguage: string) {
  const entry = JUDGE0_LANGUAGES[monacoLanguage]
  if (!entry) return null
  // Keep the same shape as before (version field for display)
  return { language: entry.name, version: '' }
}

export function isExecutionConfigured(): boolean {
  return Boolean(JUDGE0_KEY)
}

export async function executeCode(
  monacoLanguage: string,
  code:           string,
  stdin          = '',
): Promise<ExecuteResult> {
  if (!JUDGE0_KEY) {
    throw new Error(
      'Add VITE_JUDGE0_KEY to your .env file.\n' +
      'Get a free key at: rapidapi.com → search "Judge0 CE" → Subscribe (free tier)'
    )
  }

  const lang = JUDGE0_LANGUAGES[monacoLanguage]
  if (!lang) {
    throw new Error(`"${monacoLanguage}" is not supported for execution.`)
  }

  if (!code.trim()) {
    throw new Error('Nothing to run — the file is empty.')
  }

  // ?wait=true makes Judge0 run synchronously — no polling needed
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-RapidAPI-Key':  JUDGE0_KEY,
      'X-RapidAPI-Host': JUDGE0_HOST,
    },
    body: JSON.stringify({
      source_code:  code,
      language_id:  lang.id,
      stdin:        stdin || '',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Judge0 API error ${res.status}: ${text}`)
  }

  const data = await res.json()

  // Judge0 status codes: 3 = Accepted, 4 = Wrong Answer, 5 = TLE, 6 = CE, 11-12 = RE
  const stdout   = data.stdout   ?? ''
  const stderr   = data.stderr   ?? data.compile_output ?? ''
  const exitCode = data.status?.id === 3 ? 0 : (data.exit_code ?? 1)

  return {
    stdout,
    stderr,
    exitCode,
    language: lang.name,
    version:  '',
  }
}
