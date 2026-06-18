'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Lock, Loader2, FileText, ExternalLink } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toEmbedUrl, LINK_TYPES } from '@/lib/utils'

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'password' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [fileType, setFileType] = useState('HTML')
  const [content, setContent] = useState('')   // raw body: HTML / MD text / xlsx base64 / link URL
  const [xlsxHtml, setXlsxHtml] = useState('')

  useEffect(() => { tryAccess() }, [])

  async function tryAccess(pw?: string) {
    setStatus('loading')
    const res = await fetch(`/api/shared/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 401) { setStatus('password'); setMessage(pw ? 'Incorrect password' : '') }
      else { setMessage(data.error || 'Link is invalid or expired'); setStatus('error') }
      return
    }

    setReportTitle(data.title)
    setFileType(data.fileType)

    // Fetch the body via POST so password-protected links also work
    const body = await fetch(`/api/shared/${token}/content`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    }).then(r => r.text())
    setContent(body)

    if (data.fileType === 'XLSX') {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(body, { type: 'base64' })
        setXlsxHtml(XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]))
      } catch { /* ignore */ }
    }
    setStatus('ready')
  }

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  if (status === 'error') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><FileText className="w-6 h-6 text-red-500" /></div>
      <p className="text-gray-700 font-medium">{message}</p>
      <p className="text-sm text-gray-400">This link may have expired or been revoked.</p>
    </div>
  )

  if (status === 'password') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center ring-1 ring-gray-200"><Logo className="w-5 h-5" /></div>
          <span className="font-semibold text-gray-900">CRM Reports</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-400" />
          <h1 className="font-semibold text-gray-800">Password required</h1>
        </div>
        <input type="password" className="input mb-3" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryAccess(password)} autoFocus />
        {message && <p className="text-sm text-red-600 mb-3">{message}</p>}
        <button className="btn-primary w-full" onClick={() => tryAccess(password)}>Access Report</button>
      </div>
    </div>
  )

  const isMd = fileType === 'MD'
  const isXlsx = fileType === 'XLSX'
  const isLink = LINK_TYPES.includes(fileType as (typeof LINK_TYPES)[number])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center ring-1 ring-gray-200"><Logo className="w-4 h-4" /></div>
        <span className="text-sm font-semibold text-gray-900">CRM Reports</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-sm text-gray-700 truncate">{reportTitle}</span>
        {isLink && content && (
          <button onClick={() => window.open(content, '_blank', 'noopener')} className="btn-secondary py-1 px-2.5 text-xs ml-2">
            <ExternalLink className="w-3.5 h-3.5" /> Open original
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded flex-shrink-0">Shared view</span>
      </div>

      <div className="flex-1 flex flex-col">
        {isMd ? (
          <div className="max-w-3xl mx-auto p-8 w-full">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        ) : isXlsx ? (
          <div className="p-6 overflow-auto">
            <div className="xlsx-table" dangerouslySetInnerHTML={{ __html: xlsxHtml }} />
          </div>
        ) : isLink ? (
          <iframe
            src={toEmbedUrl(fileType, content)}
            className="w-full flex-1 border-0 min-h-screen"
            allow="fullscreen; clipboard-read; clipboard-write"
            title={reportTitle}
          />
        ) : (
          // HTML — rendered via srcDoc so password-protected links work too
          <iframe
            srcDoc={content}
            className="w-full flex-1 border-0 min-h-screen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={reportTitle}
          />
        )}
      </div>
    </div>
  )
}
