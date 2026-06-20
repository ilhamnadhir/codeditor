import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { createRoomDoc, type RoomDoc } from '@/lib/ydoc';
import { setAwarenessUser } from '@/lib/awareness';
import { useAuth } from '@/features/auth/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useFiles } from '@/hooks/useFiles';
import { useRunner } from '@/hooks/useRunner';
import { getColorForIndex } from '@/lib/awareness';
import { recordRecentRoom } from '@/features/rooms/roomUtils';
import { getLanguageFromFilename, canExecute } from '@/features/editor/languageMap';
import Topbar from '@/components/layout/Topbar';
import FileExplorer from '@/features/files/FileExplorer';
import EditorTabs from '@/features/editor/EditorTabs';
import MonacoWrapper from '@/features/editor/MonacoWrapper';
import RunPanel from '@/features/runner/RunPanel';
import VersionPanel from '@/features/versions/VersionPanel';
import AIPanel from '@/features/ai/AIPanel';

type PanelTab = 'ai' | 'versions';
export default function EditorPage() {
    const { roomId } = useParams<{
        roomId: string;
    }>();
    const { user, displayName, avatarUrl } = useAuth();
    const [roomDoc, setRoomDoc] = useState<RoomDoc | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('cs_theme') as 'dark' | 'light') ?? 'dark');
    const [versionsOpen, setVersionsOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [panelTab, setPanelTab] = useState<PanelTab>('ai');
    const [runOpen, setRunOpen] = useState(false);
    const [currentCode, setCurrentCode] = useState('');
    const runTriggerRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (!roomId)
            return;
        const doc = createRoomDoc(roomId);
        setRoomDoc(doc);
        recordRecentRoom({ id: roomId, name: roomId, lastVisited: Date.now() });
        return () => doc.destroy();
    }, [roomId]);
    useEffect(() => {
        if (!roomDoc)
            return;
        const colorIndex = Math.abs((user?.id ?? displayName ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
        setAwarenessUser(roomDoc.provider, {
            name: displayName,
            color: getColorForIndex(colorIndex),
            avatarUrl: avatarUrl ?? undefined,
        });
    }, [roomDoc, displayName, user, avatarUrl]);
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cs_theme', theme);
    }, [theme]);
    const localUser = useMemo(() => roomDoc
        ? { name: displayName, color: getColorForIndex(0), avatarUrl: avatarUrl ?? undefined }
        : null, [roomDoc, displayName, avatarUrl]);
    const { collaborators, metrics, updateCursor, updateSelection } = usePresence(roomDoc?.provider ?? null, localUser);
    const { files, activeFile, setActive, getYText, addFile, deleteFile, renameFile } = useFiles(roomDoc?.files ?? null);
    const activeYText = activeFile ? getYText(activeFile) : null;
    const activeLanguage = activeFile ? getLanguageFromFilename(activeFile) : 'plaintext';
    useEffect(() => {
        if (activeYText) {
            setCurrentCode(activeYText.toString());
        }
    }, [activeYText]);
    const { running, run } = useRunner(roomDoc?.terminal ?? null);
    const handleRun = useCallback(() => {
        setRunOpen(true);
        setTimeout(() => {
            run(activeLanguage, currentCode, '', displayName);
        }, 100);
    }, [run, activeLanguage, currentCode, displayName]);
    const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
    if (!roomId)
        return null;
    return (<div className="app-shell">
        <Topbar roomId={roomId} roomName={roomId} collaborators={collaborators} activeUsers={metrics.activeUsers} editCount={metrics.editCount} latencyMs={metrics.latencyMs} versionsOpen={versionsOpen} onToggleVersions={() => { setVersionsOpen(o => !o); if (!versionsOpen) setPanelTab('versions'); }} aiOpen={aiOpen} onToggleAI={() => { setAiOpen(o => !o); if (!aiOpen) setPanelTab('ai'); }} onToggleRun={() => setRunOpen(o => !o)} onRun={handleRun} running={running} canRun={canExecute(activeLanguage)} theme={theme} onToggleTheme={toggleTheme}/>

      <div className="app-shell-body">

        <div className="sidebar">
          <FileExplorer files={files} activeFile={activeFile} onSelect={setActive} onAddFile={addFile} onDelete={deleteFile} onRename={renameFile}/>
        </div>


        <div className="editor-area">
          <EditorTabs files={files} activeFile={activeFile} onSelect={setActive} onClose={name => {
            if (files.length > 1)
                deleteFile(name);
        }}/>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MonacoWrapper yText={activeYText} language={activeLanguage} provider={roomDoc?.provider ?? null} collaborators={collaborators} readOnly={false} theme={theme} onCursorChange={updateCursor} onSelectionChange={updateSelection} onContentChange={setCurrentCode}/>
          </div>
        </div>


                {(versionsOpen || aiOpen) && (<div className="panel-right">
                        <div className="panel-header">
                            <button className={`panel-tab ${panelTab === 'ai' ? 'active' : ''}`} onClick={() => { setPanelTab('ai'); setAiOpen(true); setVersionsOpen(false); }}>✦ AI</button>
                            <button className={`panel-tab ${panelTab === 'versions' ? 'active' : ''}`} onClick={() => { setPanelTab('versions'); setVersionsOpen(true); setAiOpen(false); }}>⬜ History</button>
                            <div style={{ flex: 1 }}/>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setVersionsOpen(false); setAiOpen(false); }}>✕</button>
                        </div>
                        {panelTab === 'versions' && <VersionPanel roomId={roomId} activeFile={activeFile} yText={activeYText} currentContent={currentCode} userId={user?.id}/>}
                        {panelTab === 'ai' && <AIPanel activeCode={currentCode} activeFile={activeFile} files={files} yFiles={roomDoc?.files ?? null}/>}
                    </div>)}
      </div>


      {runOpen && (<div className="panel-bottom">
          <RunPanel yTerminal={roomDoc?.terminal ?? null} language={activeLanguage} code={currentCode} userName={displayName} onRun={handleRun} running={running}/>
        </div>)}
    </div>);
}
