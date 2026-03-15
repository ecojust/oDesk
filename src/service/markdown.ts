import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
} from "@codemirror/language";

export class CodemirrorMarkdownEditor {
  private editorView: EditorView = null as any;

  constructor(
    container: HTMLElement,
    initialCode: string,
    onChange: (code: string) => void,
  ) {
    this.initEditor(container, initialCode, onChange);
  }

  initEditor(
    container: HTMLElement,
    initialCode: string,
    onChange: (code: string) => void,
  ) {
    try {
      // Clear container first
      container.innerHTML = "";

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const code = update.state.doc.toString();
          onChange && onChange(code);
        }
      });

      const state = EditorState.create({
        doc: initialCode,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          EditorState.allowMultipleSelections.of(true),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          highlightActiveLine(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          oneDark,
          updateListener,
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "13px",
              display: "flex",
              flexDirection: "column",
            },
            ".cm-scroller": {
              overflow: "auto",
              flex: "1",
              minHeight: "0",
            },
            ".cm-content": {
              fontFamily: "'Fira Code', 'Consolas', monospace",
              flex: "1",
            },
            ".cm-gutters": {
              flexShrink: 0,
            },
          }),
        ],
      });

      this.editorView = new EditorView({
        state,
        parent: container,
      });
    } catch (e) {
      console.error("Failed to initialize CodeMirror editor:", e);
    }
  }

  dispose() {
    try {
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null as any;
      }
    } catch (e) {}
  }
}

export default {
  CodemirrorMarkdownEditor,
};
