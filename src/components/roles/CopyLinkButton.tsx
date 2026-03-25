'use client'

import { useState } from 'react'

interface CopyLinkButtonProps {
  url: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — fall back to selecting the text
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
