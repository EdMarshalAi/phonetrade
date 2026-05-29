"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link2,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Code2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { uploadImage, type AdminBucket } from "@/lib/admin/upload-actions";

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-ink text-white" : "text-ink hover:bg-surface"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border/70" />;
}

export function RichEditor({
  value,
  onChange,
  bucket = "general",
}: {
  value: string;
  onChange: (html: string) => void;
  bucket?: AdminBucket;
}) {
  const [sourceMode, setSourceMode] = React.useState(false);
  const [sourceHtml, setSourceHtml] = React.useState(value || "");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

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
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onPickImage = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("bucket", bucket);
    fd.set("folder", "content");
    const res = await uploadImage(fd);
    setUploading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.url) {
      editor.chain().focus().setImage({ src: res.url }).run();
      toast.success("Изображение вставлено");
    }
  };

  const toggleSource = () => {
    if (!editor) return;
    if (!sourceMode) {
      setSourceHtml(editor.getHTML());
      setSourceMode(true);
    } else {
      editor.commands.setContent(sourceHtml || "");
      onChange(sourceHtml);
      setSourceMode(false);
    }
  };

  return (
    <div className="rounded-sm border border-border bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-2 py-1.5">
        <ToolbarButton title="Источник (HTML)" active={sourceMode} disabled={!editor} onClick={toggleSource}>
          <Code2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Жирный" active={editor?.isActive("bold")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton title="Курсив" active={editor?.isActive("italic")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Подчёркнутый" active={editor?.isActive("underline")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Зачёркнутый" active={editor?.isActive("strike")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Заголовок 1" active={editor?.isActive("heading", { level: 1 })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Заголовок 2" active={editor?.isActive("heading", { level: 2 })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Заголовок 3" active={editor?.isActive("heading", { level: 3 })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Список" active={editor?.isActive("bulletList")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Нумерованный список" active={editor?.isActive("orderedList")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Цитата" active={editor?.isActive("blockquote")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Код" active={editor?.isActive("codeBlock")} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Разделитель" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="По левому краю" active={editor?.isActive({ textAlign: "left" })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="По центру" active={editor?.isActive({ textAlign: "center" })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="По правому краю" active={editor?.isActive({ textAlign: "right" })} disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Ссылка" active={editor?.isActive("link")} disabled={!editor || sourceMode} onClick={setLink}>
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Вставить изображение" disabled={!editor || sourceMode || uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />}
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Отменить" disabled={!editor || sourceMode || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Повторить" disabled={!editor || sourceMode || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
            e.target.value = "";
          }}
        />
      </div>

      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          spellCheck={false}
          className="min-h-[300px] w-full resize-y bg-white px-3 py-3 font-mono text-[13px] leading-relaxed text-ink focus:outline-none"
          placeholder="<h2>HTML-разметка…</h2>"
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-3 focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:focus:outline-none [&_img]:rounded-md"
        />
      )}
    </div>
  );
}
