import type { FileEntry } from '@/hooks/useFiles';
import { getFileIcon } from '@/features/editor/languageMap';
interface Props {
    files: FileEntry[];
    activeFile: string | null;
    onSelect: (name: string) => void;
    onClose: (name: string) => void;
}
export default function EditorTabs({ files, activeFile, onSelect, onClose }: Props) {
    return (<div className="editor-tabs" role="tablist">
      {files.map(file => (<button key={file.name} className={`tab-item ${activeFile === file.name ? 'active' : ''}`} onClick={() => onSelect(file.name)} role="tab" aria-selected={activeFile === file.name} id={`tab-${file.name.replace(/\W/g, '-')}`}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>{getFileIcon(file.name)}</span>
          <span>{file.name}</span>
          <span className="tab-close" onClick={e => { e.stopPropagation(); onClose(file.name); }} title={`Close ${file.name}`}>
            ×
          </span>
        </button>))}
    </div>);
}
