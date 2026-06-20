/**
 * Wandbox code execution client — https://wandbox.org
 * Completely free, no API key, no account required.
 * Maintained by the Japanese open-source community since 2013.
 *
 * Compiler IDs verified against: GET https://wandbox.org/api/list.json
 */

const WANDBOX_BASE = 'https://wandbox.org/api'

export interface ExecuteResult {
  stdout:   string
  stderr:   string
  exitCode: number
  language: string
  version:  string
}

interface WandboxRuntime {
  compiler:  string     // wandbox compiler ID (e.g. "cpython-3.13.8")
  label:     string     // display name
  options?:  string     // extra compile flags
}

/**
 * Monaco language ID → Wandbox compiler.
 * All IDs verified from live https://wandbox.org/api/list.json
 */
export const WANDBOX_COMPILERS: Record<string, WandboxRuntime> = {
  javascript:      { compiler: 'nodejs-18.20.4',      label: 'Node.js 18'        },
  typescript:      { compiler: 'typescript-5.6.2',    label: 'TypeScript 5.6'    },
  javascriptreact: { compiler: 'nodejs-18.20.4',      label: 'Node.js 18'        },
  typescriptreact: { compiler: 'typescript-5.6.2',    label: 'TypeScript 5.6'    },
  python:          { compiler: 'cpython-3.13.8',      label: 'Python 3.13'       },
  java:            { compiler: 'openjdk-jdk-21+35',   label: 'Java 21'           },
  cpp:             { compiler: 'gcc-head',             label: 'GCC C++',   options: '-std=c++17' },
  c:               { compiler: 'gcc-head',             label: 'GCC C'             },
  go:              { compiler: 'go-1.14.15',           label: 'Go 1.14'           },
  rust:            { compiler: 'rust-1.64.0',          label: 'Rust 1.64'         },
  ruby:            { compiler: 'ruby-head',            label: 'Ruby'              },
  swift:           { compiler: 'swift-5.10.1',         label: 'Swift 5.10'        },
  php:             { compiler: 'php-8.0.0',            label: 'PHP 8'             },
  bash:            { compiler: 'bash',                 label: 'Bash'              },
  shell:           { compiler: 'bash',                 label: 'Bash'              },
  lua:             { compiler: 'lua-5.4.6',            label: 'Lua 5.4'           },
  haskell:         { compiler: 'ghc-9.4.5',            label: 'GHC 9.4'           },
  elixir:          { compiler: 'elixir-1.16.2',        label: 'Elixir 1.16'       },
  erlang:          { compiler: 'erlang-26.2.1',        label: 'Erlang 26'         },
  clojure:         { compiler: 'clojure-1.11.1',       label: 'Clojure 1.11'      },
  perl:            { compiler: 'perl-5.38.0',          label: 'Perl 5.38'         },
  scala:           { compiler: 'scala-3.4.2',          label: 'Scala 3.4'         },
}

/** Returns display info for a Monaco language ID, or null if unsupported */
export function getPistonRuntime(monacoLanguage: string): { language: string; version: string } | null {
  const rt = WANDBOX_COMPILERS[monacoLanguage]
  if (!rt) return null
  return { language: rt.label, version: '' }
}

/** Wandbox needs no API key — always configured */
export function isExecutionConfigured(): boolean {
  return true
}

/** Preprocess TypeScript: strip type annotations for the TS compiler (Wandbox handles it natively) */
function prepareCode(monacoLanguage: string, code: string): string {
  return code // Wandbox handles TS, Java, everything natively
}

export async function executeCode(
  monacoLanguage: string,
  code:           string,
  stdin          = '',
): Promise<ExecuteResult> {
  const rt = WANDBOX_COMPILERS[monacoLanguage]

  if (!rt) {
    throw new Error(
      `"${monacoLanguage}" isn't supported. Supported: ${Object.keys(WANDBOX_COMPILERS).join(', ')}`
    )
  }

  if (!code.trim()) {
    throw new Error('Nothing to run — the file is empty.')
  }

  const body: Record<string, string> = {
    compiler: rt.compiler,
    code:     prepareCode(monacoLanguage, code),
    stdin:    stdin ?? '',
  }

  if (rt.options) {
    body['options'] = rt.options
  }

  let res: Response
  try {
    res = await fetch(`${WANDBOX_BASE}/compile.json`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (networkErr) {
    throw new Error('Cannot reach Wandbox (wandbox.org) — check your internet connection.')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Wandbox error ${res.status}: ${text}`)
  }

  const data = await res.json()

  const stdout   = data.program_output  ?? ''
  const stderr   = data.program_error   ?? ''
  const compErr  = data.compiler_error  ?? ''
  const exitCode = parseInt(data.status ?? '0', 10)

  return {
    stdout,
    stderr:   stderr || compErr,   // show compile errors in stderr pane
    exitCode: isNaN(exitCode) ? 0 : exitCode,
    language: rt.label,
    version:  rt.compiler,
  }
}
