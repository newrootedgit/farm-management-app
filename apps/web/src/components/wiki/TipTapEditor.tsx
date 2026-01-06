import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface TipTapEditorProps {
  content: any;
  onChange?: (content: any) => void;
  editable?: boolean;
  placeholder?: string;
}

export function TipTapEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Start writing...',
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('strike') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <s>S</s>
          </button>
          <div className="w-px bg-border mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 1 }) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 3 }) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            H3
          </button>
          <div className="w-px bg-border mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('bulletList') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            &bull; List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('orderedList') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('blockquote') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('codeBlock') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {'</>'}
          </button>
          <div className="w-px bg-border mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 rounded text-sm hover:bg-muted disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 rounded text-sm hover:bg-muted disabled:opacity-50"
          >
            Redo
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none ${
          editable ? '' : 'cursor-default'
        }`}
      />
      <style>{`
        .tiptap-editor .ProseMirror {
          outline: none;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.75em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.1em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.25em;
        }
        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .tiptap-editor .ProseMirror li {
          margin: 0.25em 0;
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid #ddd;
          padding-left: 1em;
          margin: 0.5em 0;
          color: #666;
        }
        .tiptap-editor .ProseMirror pre {
          background: #f4f4f4;
          padding: 0.75em;
          border-radius: 4px;
          font-family: monospace;
          overflow-x: auto;
        }
        .tiptap-editor .ProseMirror code {
          background: #f4f4f4;
          padding: 0.1em 0.3em;
          border-radius: 2px;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}
