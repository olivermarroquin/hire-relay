import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendSubmissionNotification } from "@/lib/email/resend";
import type { SubmitCandidatePayload } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createAdminClient();

  // console.log('[submit] token:', token)
  // console.log('[submit] url:', request.url)

  // 1. Look up role by submission_token
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, company_id, title, status")
    .eq("submission_token", token)
    .single();

  // console.log("[submit] role id:", role?.id ?? null);
  // console.log("[submit] role error:", roleError?.message ?? null);

  if (roleError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (role.status !== "open") {
    return NextResponse.json(
      { error: "This role is no longer accepting submissions" },
      { status: 400 },
    );
  }

  // 2. Parse and validate request body
  let body: SubmitCandidatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    full_name,
    email,
    linkedin_url,
    recruiter_notes,
    recruiter_name,
    recruiter_email,
  } = body;

  if (!full_name?.trim()) {
    return NextResponse.json(
      { error: "full_name is required" },
      { status: 400 },
    );
  }

  const emailValue = email?.trim().toLowerCase();
  if (!emailValue || !EMAIL_RE.test(emailValue)) {
    return NextResponse.json(
      { error: "A valid candidate email is required" },
      { status: 400 },
    );
  }

  const recruiterEmailValue = recruiter_email?.trim().toLowerCase() || null;
  if (recruiterEmailValue && !EMAIL_RE.test(recruiterEmailValue)) {
    return NextResponse.json(
      { error: "recruiter_email is not a valid email address" },
      { status: 400 },
    );
  }

  // 3. Insert candidate — company_id and role_id come from the matched role only
  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      role_id: role.id,
      company_id: role.company_id,
      full_name: full_name.trim(),
      email: emailValue,
      linkedin_url: linkedin_url?.trim() || null,
      recruiter_notes: recruiter_notes?.trim() || null,
      recruiter_name: recruiter_name?.trim() || null,
      recruiter_email: recruiterEmailValue,
      status: "pending",
    })
    .select("id, review_token")
    .single();

  if (insertError || !candidate) {
    console.error("Candidate insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to submit candidate" },
      { status: 500 },
    );
  }

  // 4. Send email notification to hiring manager (best-effort — don't fail the request)
  try {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", role.company_id)
      .single();

    const { data: hmProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("company_id", role.company_id)
      .eq("role", "hiring_manager")
      .limit(1)
      .single();

    if (hmProfile?.email && company?.name) {
      await sendSubmissionNotification({
        candidateName: full_name.trim(),
        roleTitle: role.title,
        companyName: company.name,
        recruiterName: recruiter_name?.trim() || null,
        recruiterNotes: recruiter_notes?.trim() || null,
        reviewToken: candidate.review_token,
        hiringManagerEmail: hmProfile.email,
      });
    }
  } catch (emailError) {
    console.error("Submission notification failed (non-fatal):", emailError);
  }

  return NextResponse.json({ success: true, candidateId: candidate.id });
}
