import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

export default function CodeEditor({
  path = '',
  defaultValue = '',
  language = 'javascript',
  onSave,
  onCursorChange,
  onEditorMount,
  readOnly = false,
  fontSize = 14,
  wordWrap = 'on',
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom CodeSync theme matching developer palette
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'tag', foreground: 'f43f5e' },
        { token: 'attribute.name', foreground: 'a78bfa' },
        { token: 'type', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#f1f5f9',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#a5b4fc',
        'editorCursor.foreground': '#818cf8',
        'editor.selectionBackground': '#24324c',
        'editor.inactiveSelectionBackground': '#182234',
        'editor.lineHighlightBackground': '#0e1524',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
      },
    });

    monaco.editor.setTheme('codesync-dark');

    // Track cursor movements
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          col: e.position.column,
        });
      }
    });

    // Custom keyboard shortcut: Ctrl+S or Cmd+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave();
      }
    });

    // Call external mount hook (for Yjs MonacoBinding)
    if (onEditorMount) {
      onEditorMount(editor, monaco);
    }
  };

  // Language mapping
  const resolveLanguage = (lang) => {
    const ext = lang?.toLowerCase();
    if (ext === 'js' || ext === 'javascript') return 'javascript';
    if (ext === 'jsx') return 'javascript';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'markdown';
    return lang || 'javascript';
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090d16]">
      <Editor
        key={path || 'editor'}
        path={path || 'model'}
        height="100%"
        width="100%"
        language={resolveLanguage(language)}
        defaultValue={defaultValue}
        onMount={handleEditorDidMount}
        loading={
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs font-mono">Initializing Monaco...</span>
          </div>
        }
        options={{
          readOnly,
          fontSize,
          wordWrap,
          tabSize: 2,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'all',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
