import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

export default function CodeEditor({ value, onChange, readOnly }) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      // Register custom Verilog keywords for syntax highlighting if not already present
      monaco.languages.register({ id: 'verilog' });
      monaco.languages.setMonarchTokensProvider('verilog', {
        keywords: [
          'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
          'always', 'assign', 'begin', 'end', 'if', 'else', 'case', 'endcase',
          'default', 'posedge', 'negedge', 'parameter', 'initial', 'integer',
        ],
        operators: ['=', '<=', '==', '!=', '&&', '||', '&', '|', '^', '~', '+', '-', '*', '/'],
        tokenizer: {
          root: [
            [/[a-zA-Z_]\w*/, {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier',
              },
            }],
            [/\/\/.*/, 'comment'],
            [/\/\*[\s\S]*?\*\//, 'comment'],
            [/\d+'[bBoOdDhH][0-9a-fA-F_]+/, 'number'],
            [/\d+/, 'number'],
          ],
        },
      });
    }
  }, [monaco]);

  return (
    <div className="monaco-editor-container">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>⚡ submission.v</span>
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Verilog-2001 Synthesizable HDL
        </div>
      </div>
      <Editor
        height="420px"
        language="verilog"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
          minimap: { enabled: false },
          wordWrap: 'on',
          tabSize: 2,
          scrollBeyondLastLine: false,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
