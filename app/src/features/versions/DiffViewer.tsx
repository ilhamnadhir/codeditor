import { useEffect, useRef } from 'react';
import type * as Y from 'yjs';
import type { Snapshot } from '@/hooks/useVersions';
interface DiffLine {
    type: 'added' | 'removed' | 'context';
    text: string;
    lineNum: number;
}
function computeDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const result: DiffLine[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.unshift({ type: 'context', text: oldLines[i - 1], lineNum: i });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', text: newLines[j - 1], lineNum: j });
            j--;
        }
        else {
            result.unshift({ type: 'removed', text: oldLines[i - 1], lineNum: i });
            i--;
        }
    }
    return collapseContext(result);
}
function collapseContext(lines: DiffLine[], context = 3): DiffLine[] {
    const changed = new Set<number>();
    lines.forEach((l, i) => {
        if (l.type !== 'context')
            changed.add(i);
    });
    const visible = new Set<number>();
    changed.forEach(i => {
        for (let d = -context; d <= context; d++) {
            if (i + d >= 0 && i + d < lines.length)
                visible.add(i + d);
        }
    });
    const result: DiffLine[] = [];
    let lastVisible = -1;
    lines.forEach((line, i) => {
        if (!visible.has(i))
            return;
        if (lastVisible !== -1 && i > lastVisible + 1) {
            result.push({ type: 'context', text: '...', lineNum: -1 });
        }
        result.push(line);
        lastVisible = i;
    });
    return result;
}
interface Props {
    snapshot: Snapshot;
    currentText: string;
}
export default function DiffViewer({ snapshot, currentText }: Props) {
    const diff = computeDiff(snapshot.content, currentText);
    const added = diff.filter(l => l.type === 'added').length;
    const removed = diff.filter(l => l.type === 'removed').length;
    return (<div>

      <div className="flex gap-2 mb-3" style={{ fontSize: 12 }}>
        <span className="badge badge-green">+{added}</span>
        <span className="badge badge-red">−{removed}</span>
        <span className="text-muted">vs snapshot "{snapshot.label}"</span>
      </div>

      {diff.length === 0 ? (<div className="text-muted text-sm">No differences — content is identical.</div>) : (<div className="diff-viewer">
          {diff.map((line, idx) => (<div key={idx} className={`diff-line ${line.type}`}>
              <span className="diff-line-num">
                {line.lineNum > 0 ? line.lineNum : ''}
              </span>
              <span className="diff-line-sign">
                {line.type === 'added' ? '+'
                    : line.type === 'removed' ? '−'
                        : ' '}
              </span>
              <span>{line.text}</span>
            </div>))}
        </div>)}
    </div>);
}
