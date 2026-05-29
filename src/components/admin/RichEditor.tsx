"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, disabled, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm text-[13px] transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-ink text-white"
          : "text-ink hover:bg-surface"
      )}
    >
      {children}
    </button>
  );
}

export function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value when it differs
  const prevValue = React.useRef(value);
  React.useEffect(() => {
    if (!editor) return;
    if (value !== prevValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    prevValue.current = value;
  }, [editor, value]);

  const setLink = React.useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL ссылки", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <div className="rounded-sm border border-border bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-2 py-1.5">
        <ToolbarButton
          title="Жирный"
          active={editor?.isActive("bold")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton
          title="Курсив"
          active={editor?.isActive("italic")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border/70" />

        <ToolbarButton
          title="Заголовок H2"
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Заголовок H3"
          active={editor?.isActive("heading", { level: 3 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border/70" />

        <ToolbarButton
          title="Маркированный список"
          active={editor?.isActive("bulletList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Нумерованный список"
          active={editor?.isActive("orderedList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border/70" />

        <ToolbarButton
          title="Ссылка"
          active={editor?.isActive("link")}
          disabled={!editor}
          onClick={setLink}
        >
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border/70" />

        <ToolbarButton
          title="Отменить"
          disabled={!editor || !editor.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Повторить"
          disabled={!editor || !editor.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:focus:outline-none"
      />
    </div>
  );
}
