import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendSubmissionNotification } from "@/lib/email/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PDF only for MVP: browsers open PDFs natively in a new tab, which is how the
// review page will present them. doc/docx would trigger a download instead of
// inline display, which adds friction without benefit at this stage.
const ALLOWED_MIME = "application/pdf";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createAdminClient();

  // 1. Look up role by submission_token
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, company_id, title, status")
    .eq("submission_token", token)
    .single();

  if (roleError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (role.status !== "open") {
    return NextResponse.json(
      { error: "This role is no longer accepting submissions" },
      { status: 400 },
    );
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 3. Extract and validate text fields
  const full_name = ((formData.get("full_name") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const linkedin_url = ((formData.get("linkedin_url") as string | null) ?? "").trim() || null;
  const recruiter_notes = ((formData.get("recruiter_notes") as string | null) ?? "").trim() || null;
  const recruiter_name = ((formData.get("recruiter_name") as string | null) ?? "").trim() || null;
  const recruiter_email_raw = ((formData.get("recruiter_email") as string | null) ?? "").trim().toLowerCase() || null;

  if (!full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid candidate email is required" }, { status: 400 });
  }

  if (recruiter_email_raw && !EMAIL_RE.test(recruiter_email_raw)) {
    return NextResponse.json(
      { error: "recruiter_email is not a valid email address" },
      { status: 400 },
    );
  }

  // 4. Validate resume file if one was provided.
  //    We check MIME type server-side — never trust the client's Content-Type alone.
  //    If no file is present, or the entry is not a File, we skip upload entirely.
  const resumeEntry = formData.get("resume");
  let validatedFile: File | null = null;

  if (resumeEntry instanceof File && resumeEntry.size > 0) {
    if (resumeEntry.type !== ALLOWED_MIME) {
      return NextResponse.json({ error: "Resume must be a PDF file" }, { status: 400 });
    }
    if (resumeEntry.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Resume must be 5 MB or smaller" },
        { status: 400 },
      );
    }
    validatedFile = resumeEntry;
  }

  // 5. Insert candidate row — company_id and role_id come from the DB-looked-up role only,
  //    never from the request body.
  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      role_id: role.id,
      company_id: role.company_id,
      full_name,
      email,
      linkedin_url,
      recruiter_notes,
      recruiter_name,
      recruiter_email: recruiter_email_raw,
      status: "pending",
    })
    .select("id, review_token")
    .single();

  if (insertError || !candidate) {
    console.error("Candidate insert error:", insertError);
    return NextResponse.json({ error: "Failed to submit candidate" }, { status: 500 });
  }

  // 6. Upload resume if one was provided.
  //
  //    Strategy: insert candidate first to get a server-controlled candidate.id,
  //    then use it as the storage path prefix so the path is never client-supplied.
  //
  //    Rollback on failure: if the storage upload succeeds but the resume_url UPDATE
  //    fails (or if upload itself fails), we delete the candidate row and the uploaded
  //    object (if any) and return an error. This avoids leaving a half-broken record
  //    (candidate with no resume_url when a file was expected) without needing a
  //    distributed transaction.
  if (validatedFile) {
    const storagePath = `${candidate.id}/resume.pdf`;
    const fileBuffer = await validatedFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Resume upload error:", uploadError);
      // Roll back: remove the candidate row so no orphaned record is left.
      await supabase.from("candidates").delete().eq("id", candidate.id);
      return NextResponse.json(
        { error: "Failed to upload resume. Please try again." },
        { status: 500 },
      );
    }

    // Store only the storage path — signed URLs are generated on demand at read time
    // so they never go stale.
    const { error: updateError } = await supabase
      .from("candidates")
      .update({ resume_url: storagePath })
      .eq("id", candidate.id);

    if (updateError) {
      console.error("Resume URL update error:", updateError);
      // Upload succeeded but we couldn't persist the path. Clean up both sides.
      await supabase.storage.from("resumes").remove([storagePath]);
      await supabase.from("candidates").delete().eq("id", candidate.id);
      return NextResponse.json(
        { error: "Failed to submit candidate. Please try again." },
        { status: 500 },
      );
    }
  }

  // 7. Send email notification to hiring manager (best-effort — don't fail the request)
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
        candidateName: full_name,
        roleTitle: role.title,
        companyName: company.name,
        recruiterName: recruiter_name,
        recruiterNotes: recruiter_notes,
        reviewToken: candidate.review_token,
        hiringManagerEmail: hmProfile.email,
      });
    }
  } catch (emailError) {
    console.error("Submission notification failed (non-fatal):", emailError);
  }

  return NextResponse.json({ success: true, candidateId: candidate.id });
}
