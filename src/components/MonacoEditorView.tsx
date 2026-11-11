import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import {
  Save,
  Sparkles,
  HelpCircle,
  Check,
  RotateCw,
  Code2,
  FileCode,
  Sliders,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.js';
import { useAuth } from '../context/AuthContext.js';
import { broadcastCursorMove } from '../services/socket.js';

interface MonacoEditorViewProps {
  onTriggerAiReview: (selectedCode?: string) => void;
  onTriggerAiExplain: (selectedCode?: string) => void;
}

export const MonacoEditorView: React.FC<MonacoEditorViewProps> = ({
  onTriggerAiReview,
  onTriggerAiExplain,
}) => {
  const { project, activeFile, saveActiveFile, userRole, updateFileContentLocally } = useProject();
  const { user, token } = useAuth();

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [hasSelection, setHasSelection] = useState(false);

  const isReadOnly = userRole === 'viewer';

  // Cleanup active Yjs connection and binding
  const cleanupYjs = useCallback(() => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
  }, []);

  // Setup Yjs binding on editor mount or file change
  const setupYjs = useCallback(() => {
    if (!editorRef.current || !activeFile || !project) return;

    cleanupYjs();

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    try {
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/yjs-ws`;
      const roomName = `project:${project.id}:file:${activeFile.id}`;

      const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
        params: { token: token || '' },
      });
      providerRef.current = provider;

      provider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
        setSyncStatus(event.status);
      });

      const ytext = ydoc.getText('monaco');

      // Set user awareness info
      if (user) {
        provider.awareness.setLocalStateField('user', {
          name: user.name,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          email: user.email,
        });
      }

      // If document is empty upon connection and we have existing content from database, initialize it
      provider.on('sync', (isSynced: boolean) => {
        if (isSynced && ytext.length === 0 && activeFile.content) {
          ytext.insert(0, activeFile.content);
        }
      });

      // Bind Monaco with Yjs text CRDT
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;

      // Track local edits
      ytext.observe(() => {
        setSaveStatus('dirty');
        updateFileContentLocally(ytext.toString());
      });
    } catch (err) {
      console.warn('Yjs Monaco binding fallback to standard editor:', err);
    }
  }, [activeFile, project, token, user, cleanupYjs, updateFileContentLocally]);

  useEffect(() => {
    setupYjs();
    return () => cleanupYjs();
  }, [setupYjs, cleanupYjs]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure dark theme settings
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b40',
        'editorCursor.foreground': '#818cf8',
        'editorWhitespace.foreground': '#334155',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#3b82f6',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
      },
    });
    monaco.editor.setTheme('codesync-dark');

    // Track cursor movement
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
      if (project && activeFile) {
        broadcastCursorMove(project.id, activeFile.id, {
          line: e.position.lineNumber,
          ch: e.position.column,
        });
      }
    });

    // Track text selection
    editor.onDidChangeCursorSelection((e) => {
      const sel = editor.getSelection();
      const hasText = sel && !sel.isEmpty();
      setHasSelection(Boolean(hasText));
    });

    // Keyboard shortcut: Ctrl+S / Cmd+S for manual checkpoint save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleManualSave();
    });

    setupYjs();
  };

  const handleManualSave = async () => {
    if (!editorRef.current || isReadOnly) return;
    setSaveStatus('saving');
    try {
      const text = editorRef.current.getValue();
      await saveActiveFile(text);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('dirty');
    }
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const getSelectedOrFullCode = (): string => {
    if (!editorRef.current) return '';
    const selection = editorRef.current.getSelection();
    if (selection && !selection.isEmpty()) {
      return editorRef.current.getModel()?.getValueInRange(selection) || '';
    }
    return editorRef.current.getValue();
  };

  const triggerReview = () => {
    const code = getSelectedOrFullCode();
    onTriggerAiReview(code);
  };

  const triggerExplain = () => {
    const code = getSelectedOrFullCode();
    onTriggerAiExplain(code);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 select-none">
        <Code2 className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-base font-semibold text-slate-400">No File Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a file from the explorer to begin collaborating.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] overflow-hidden">
      {/* Editor Top Control Bar */}
      <div className="h-10 px-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0 text-xs">
        {/* Left: Active File Tab & Sync Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded border border-slate-800 text-slate-200 font-medium">
            <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono text-xs truncate">{activeFile.path}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="capitalize">{syncStatus}</span>
          </div>

          {/* Save Status */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            {saveStatus === 'saving' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <RotateCw className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-emerald-400/90 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            ) : (
              <span className="text-slate-400">Unsaved changes</span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Save File (Ctrl+S / Cmd+S)"
            >
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline text-xs">Save</span>
            </button>
          )}

          <button
            onClick={handleFormatCode}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Format Code"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline text-xs">Format</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* AI Code Review Button */}
          <button
            onClick={triggerReview}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded font-medium transition-colors text-xs"
            title={hasSelection ? 'Review Selected Code Lines' : 'Review Entire File'}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{hasSelection ? 'Review Selection' : 'AI Review'}</span>
          </button>

          {/* AI Explain Button */}
          <button
            onClick={triggerExplain}
            className="flex items-center gap-1.5 px-3 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-sky-200 border border-sky-500/30 rounded font-medium transition-colors text-xs"
            title={hasSelection ? 'Explain Selected Code Lines' : 'Explain Entire File'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>{hasSelection ? 'Explain Selection' : 'AI Explain'}</span>
          </button>
        </div>
      </div>

      {/* Center Monaco Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          path={activeFile.path}
          defaultLanguage={activeFile.language || 'javascript'}
          language={activeFile.language || 'javascript'}
          defaultValue={activeFile.content}
          theme="codesync-dark"
          onMount={handleEditorMount}
          options={{
            readOnly: isReadOnly,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
          }}
        />
      </div>

      {/* Footer Status Line */}
      <div className="h-6 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 select-none font-mono tabular-nums shrink-0">
        <div className="flex items-center gap-3">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="hidden sm:inline">Spaces: 2</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="capitalize">{activeFile.language}</span>
        </div>
        <div className="flex items-center gap-2">
          {isReadOnly && <span className="text-amber-500/90 font-semibold uppercase">Read Only</span>}
          <span className="text-slate-400">Yjs Collaborative CRDT Sync</span>
        </div>
      </div>
    </div>
  );
};
