export const LANGUAGE_TO_EXTENSIONS: Record<string, string[]> = {
    javascript: ['js', 'mjs', 'cjs'],
    typescript: ['ts', 'mts', 'cts'],
    javascriptreact: ['jsx'],
    typescriptreact: ['tsx'],
    python: ['py', 'pyw'],
    java: ['java'],
    cpp: ['cpp', 'cc', 'cxx', 'c++'],
    c: ['c', 'h'],
    csharp: ['cs'],
    go: ['go'],
    rust: ['rs'],
    ruby: ['rb'],
    php: ['php'],
    swift: ['swift'],
    kotlin: ['kt', 'kts'],
    scala: ['scala', 'sc'],
    html: ['html', 'htm'],
    css: ['css'],
    scss: ['scss', 'sass'],
    json: ['json', 'jsonc'],
    yaml: ['yaml', 'yml'],
    markdown: ['md', 'mdx'],
    sql: ['sql'],
    shell: ['sh', 'bash', 'zsh'],
    dockerfile: ['Dockerfile'],
    xml: ['xml', 'svg'],
    plaintext: ['txt'],
};
export const EXT_TO_LANGUAGE: Record<string, string> = Object.entries(LANGUAGE_TO_EXTENSIONS).reduce<Record<string, string>>((acc, [lang, exts]) => {
    exts.forEach(ext => { acc[ext] = lang; });
    return acc;
}, {});
export function getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return EXT_TO_LANGUAGE[ext] ?? 'plaintext';
}
export const LANGUAGE_LABELS: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    javascriptreact: 'JSX',
    typescriptreact: 'TSX',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    ruby: 'Ruby',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    markdown: 'Markdown',
    sql: 'SQL',
    shell: 'Shell',
    plaintext: 'Plain Text',
};
export function canExecute(monacoLanguage: string): boolean {
    const executables = new Set([
        'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
        'python', 'java', 'cpp', 'c', 'go', 'rust',
        'ruby', 'swift', 'php', 'bash', 'shell',
        'lua', 'haskell', 'elixir', 'erlang', 'clojure', 'perl', 'scala',
    ]);
    return executables.has(monacoLanguage);
}
export const LANGUAGE_ICONS: Record<string, string> = {
    javascript: '🟨',
    typescript: '🔷',
    javascriptreact: '⚛️',
    typescriptreact: '⚛️',
    python: '🐍',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    go: '🐹',
    rust: '🦀',
    html: '🌐',
    css: '🎨',
    json: '📋',
    markdown: '📝',
    sql: '🗄️',
};
export function getFileIcon(filename: string): string {
    const lang = getLanguageFromFilename(filename);
    return LANGUAGE_ICONS[lang] ?? '📄';
}
