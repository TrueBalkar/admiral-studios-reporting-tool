'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Columns2, FileEdit } from 'lucide-react'

interface Props {
  content: string
  onChange: (md: string) => void
  placeholder?: string
}

export default function MarkdownEditor({ content, onChange, placeholder }: Props) {
  const [split, setSplit] = useState(true)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-400 font-medium mr-2">Markdown</span>
        <button
          type="button"
          onClick={() => setSplit(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${!split ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <FileEdit className="w-3.5 h-3.5" /> Edit only
        </button>
        <button
          type="button"
          onClick={() => setSplit(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${split ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Columns2 className="w-3.5 h-3.5" /> Split view
        </button>
      </div>

      <div className={`flex ${split ? 'divide-x divide-gray-100' : ''}`}>
        {/* Editor */}
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '# Title\n\nStart writing…'}
          className={`${split ? 'w-1/2' : 'w-full'} font-mono text-sm px-5 py-4 min-h-[400px] resize-none focus:outline-none bg-white text-gray-800 placeholder-gray-300`}
          spellCheck={false}
        />

        {/* Preview */}
        {split && (
          <div className="w-1/2 px-6 py-4 min-h-[400px] overflow-y-auto bg-gray-50">
            {content.trim() ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-300 italic">Preview will appear here…</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
