'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Lock, Loader2, FileText } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'password' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [fileType, setFileType] = useState('HTML')
  const [mdContent, setMdContent] = useState('')

  useEffect(() => { tryAccess() }, [])

  async function tryAccess(pw?: string) {
    setStatus('loading')
    const res = await fetch(`/api/shared/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    const data = await res.json()
    if (res.ok) {
      setReportTitle(data.title)
      setFileType(data.fileType)
      if (data.fileType === 'MD') {
        const content = await fetch(`/api/shared/${token}/content`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) }).then(r => r.text())
        setMdContent(content)
      }
      setStatus('ready')
    } else if (res.status === 401) {
      setStatus('password')
    } else {
      setMessage(data.error || 'Link is invalid or expired')
      setStatus('error')
    }
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center ring-1 ring-gray-200"><Logo className="w-4 h-4" /></div>
        <span className="text-sm font-semibold text-gray-900">CRM Reports</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-sm text-gray-700">{reportTitle}</span>
        <span className="ml-auto text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">Shared view</span>
      </div>
      <div className="flex-1">
        {fileType === 'MD' ? (
          <div className="max-w-3xl mx-auto p-8">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <iframe src={`/api/shared/${token}/content`} className="w-full h-full border-0 min-h-screen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title={reportTitle} />
        )}
      </div>
    </div>
  )
}
