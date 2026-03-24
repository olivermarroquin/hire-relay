'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SubmitFormProps {
  token: string
  roleTitle: string
}

interface Fields {
  full_name: string
  email: string
  linkedin_url: string
  recruiter_notes: string
  recruiter_name: string
  recruiter_email: string
}

export function SubmitForm({ token, roleTitle }: SubmitFormProps) {
  const [fields, setFields] = useState<Fields>({
    full_name: '',
    email: '',
    linkedin_url: '',
    recruiter_notes: '',
    recruiter_name: '',
    recruiter_email: '',
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Build FormData so we can include the file alongside text fields.
    // The server performs all real validation — the accept attribute is a UI hint only.
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (value.trim()) formData.append(key, value)
    })
    if (resumeFile) {
      formData.append('resume', resumeFile)
    }

    const res = await fetch(`/api/submit/${token}`, {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">Candidate submitted successfully</p>
        <p className="mt-1 text-sm text-green-700">
          The hiring team has been notified and will review the candidate shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-zinc-500">
        Submitting for: <span className="font-medium text-zinc-700">{roleTitle}</span>
      </p>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Candidate info
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name <span className="text-red-500">*</span></Label>
          <Input
            id="full_name"
            value={fields.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/..."
            value={fields.linkedin_url}
            onChange={(e) => set('linkedin_url', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resume">
            Resume{' '}
            <span className="font-normal text-zinc-400">(PDF only, max 5 MB)</span>
          </Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Your info (optional)
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="recruiter_name">Your name</Label>
          <Input
            id="recruiter_name"
            value={fields.recruiter_name}
            onChange={(e) => set('recruiter_name', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recruiter_email">
            Your email{' '}
            <span className="font-normal text-zinc-400">(to receive status updates)</span>
          </Label>
          <Input
            id="recruiter_email"
            type="email"
            value={fields.recruiter_email}
            onChange={(e) => set('recruiter_email', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recruiter_notes">Notes for the hiring team</Label>
          <Textarea
            id="recruiter_notes"
            placeholder="Why are you excited about this candidate? Any context on comp, availability, etc."
            value={fields.recruiter_notes}
            onChange={(e) => set('recruiter_notes', e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit candidate'}
      </Button>
    </form>
  )
}
