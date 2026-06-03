'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Link2, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Code2, AlignLeft, AlignCenter,
  AlignRight, Undo2, Redo2, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded text-sm transition-colors',
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />
}

export default function HtmlEditor({ content, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[400px] px-6 py-4 focus:outline-none',
      },
    },
  })

  if (!editor) return null

  function setLink() {
    const url = window.prompt('URL', editor!.getAttributes('link').href)
    if (url === null) return
    if (url === '') { editor!.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const btn = (label: string, icon: React.ReactNode, active: boolean, action: () => void) => (
    <ToolbarBtn key={label} onClick={action} active={active} title={label}>{icon}</ToolbarBtn>
  )

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {btn('Heading 1', <Heading1 className="w-4 h-4" />, editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {btn('Heading 2', <Heading2 className="w-4 h-4" />, editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn('Heading 3', <Heading3 className="w-4 h-4" />, editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        <Divider />
        {btn('Bold',          <Bold className="w-4 h-4" />,          editor.isActive('bold'),          () => editor.chain().focus().toggleBold().run())}
        {btn('Italic',        <Italic className="w-4 h-4" />,        editor.isActive('italic'),        () => editor.chain().focus().toggleItalic().run())}
        {btn('Underline',     <UnderlineIcon className="w-4 h-4" />, editor.isActive('underline'),     () => editor.chain().focus().toggleUnderline().run())}
        {btn('Strikethrough', <Strikethrough className="w-4 h-4" />, editor.isActive('strike'),        () => editor.chain().focus().toggleStrike().run())}
        <Divider />
        {btn('Bullet list',   <List className="w-4 h-4" />,          editor.isActive('bulletList'),    () => editor.chain().focus().toggleBulletList().run())}
        {btn('Ordered list',  <ListOrdered className="w-4 h-4" />,   editor.isActive('orderedList'),   () => editor.chain().focus().toggleOrderedList().run())}
        <Divider />
        {btn('Blockquote',    <Quote className="w-4 h-4" />,         editor.isActive('blockquote'),    () => editor.chain().focus().toggleBlockquote().run())}
        {btn('Code',          <Code2 className="w-4 h-4" />,         editor.isActive('code'),          () => editor.chain().focus().toggleCode().run())}
        {btn('Link',          <Link2 className="w-4 h-4" />,         editor.isActive('link'),          setLink)}
        {btn('Horizontal rule', <Minus className="w-4 h-4" />,       false,                            () => editor.chain().focus().setHorizontalRule().run())}
        <Divider />
        {btn('Align left',    <AlignLeft className="w-4 h-4" />,     editor.isActive({ textAlign: 'left' }),   () => editor.chain().focus().setTextAlign('left').run())}
        {btn('Align center',  <AlignCenter className="w-4 h-4" />,   editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run())}
        {btn('Align right',   <AlignRight className="w-4 h-4" />,    editor.isActive({ textAlign: 'right' }),  () => editor.chain().focus().setTextAlign('right').run())}
        <Divider />
        {btn('Undo', <Undo2 className="w-4 h-4" />, false, () => editor.chain().focus().undo().run())}
        {btn('Redo', <Redo2 className="w-4 h-4" />, false, () => editor.chain().focus().redo().run())}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
