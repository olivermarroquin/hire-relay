import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Signed URLs expire after 1 hour. They are generated on-demand and never stored.
const SIGNED_URL_EXPIRY_SECONDS = 3600

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  // 1. Validate the review_token — this is the security boundary.
  //    The token is a UUID stored on the candidate row. Anyone who holds a valid
  //    token may access the resume, matching the access model of the review page itself.
  //    We select only resume_url — nothing else needs to leave the DB here.
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('resume_url')
    .eq('review_token', token)
    .single()

  if (error || !candidate) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!candidate.resume_url) {
    return NextResponse.json({ error: 'No resume on file' }, { status: 404 })
  }

  // 2. Generate a short-lived signed URL from the stored storage path.
  //    The raw path (candidate.resume_url) is never sent to the client —
  //    only the opaque, time-limited Supabase-signed URL is returned, and
  //    only as a redirect target that the browser follows immediately.
  const { data: signed, error: signError } = await supabase.storage
    .from('resumes')
    .createSignedUrl(candidate.resume_url, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error('Signed URL generation error:', signError)
    return NextResponse.json({ error: 'Failed to retrieve resume' }, { status: 500 })
  }

  // 3. Redirect the browser to the signed URL.
  //    The storage path is never surfaced as a readable client value.
  return NextResponse.redirect(signed.signedUrl)
}
