-- seed.sql
-- Demo data for 2 pilot companies
-- Run AFTER 001_initial_schema.sql
-- Run AFTER creating auth users in Supabase dashboard

-- ─────────────────────────────────────────
-- STEP 1: Create auth users in Supabase dashboard first
-- Go to: Authentication > Users > Add User
--   Email: hm@demo-acme.com     (note the UUID it creates)
--   Email: hm@demo-vertex.com   (note the UUID it creates)
-- Then replace the UUIDs below with the real ones
-- ─────────────────────────────────────────

-- PLACEHOLDER UUIDs — replace with real auth.users UUIDs
do $$
declare
  acme_company_id uuid := gen_random_uuid();
  vertex_company_id uuid := gen_random_uuid();

  -- Replace these with actual UUIDs from auth.users after creating users
  acme_hm_user_id uuid := 'bdc35e92-ec7c-490d-b1e0-ab81f4cd677a';
  vertex_hm_user_id uuid := '69dcaf42-b8f8-4e74-b5c6-5411ed1eda2f';

  acme_role1_id uuid := gen_random_uuid();
  acme_role2_id uuid := gen_random_uuid();
  vertex_role1_id uuid := gen_random_uuid();

begin

-- Companies
insert into public.companies (id, name, slug) values
  (acme_company_id, 'Acme Corp', 'acme-corp'),
  (vertex_company_id, 'Vertex Labs', 'vertex-labs');

-- Profiles
-- insert into public.profiles (id, company_id, role, full_name, email) values
--   (acme_hm_user_id, acme_company_id, 'hiring_manager', 'Alex (Acme)', 'hm@demo-acme.com'),
--   (vertex_hm_user_id, vertex_company_id, 'hiring_manager', 'Jordan (Vertex)', 'hm@demo-vertex.com');

-- Roles for Acme Corp
insert into public.roles (id, company_id, title, department, status, created_by) values
  (acme_role1_id, acme_company_id, 'Senior Backend Engineer', 'Engineering', 'open', acme_hm_user_id),
  (acme_role2_id, acme_company_id, 'Product Designer', 'Design', 'open', acme_hm_user_id);

-- Role for Vertex Labs
insert into public.roles (id, company_id, title, department, status, created_by) values
  (vertex_role1_id, vertex_company_id, 'Head of Growth', 'Marketing', 'open', vertex_hm_user_id);

-- Sample candidates (pending — for dashboard demo)
insert into public.candidates (role_id, company_id, full_name, email, linkedin_url, recruiter_notes, recruiter_email, recruiter_name, status) values
  (acme_role1_id, acme_company_id, 'Jamie Chen', 'jamie.chen@example.com', 'https://linkedin.com/in/jamie-chen', 'Strong systems background, 7 YOE. Currently at Stripe. Open to relocation. Requesting $220k.', 'recruiter@talentco.com', 'Sarah (TalentCo)', 'pending'),
  (acme_role1_id, acme_company_id, 'Morgan Lee', 'morgan.lee@example.com', 'https://linkedin.com/in/morgan-lee', 'Ex-Amazon, strong distributed systems. Passive candidate — needs quick response or will accept another offer.', 'recruiter@talentco.com', 'Sarah (TalentCo)', 'pending'),
  (acme_role2_id, acme_company_id, 'Riley Park', 'riley.park@example.com', 'https://linkedin.com/in/riley-park', 'Portfolio is exceptional. Has worked on B2B SaaS products. Currently freelancing.', 'recruiter@designstudio.com', 'Tom (DesignStudio)', 'interview'),
  (vertex_role1_id, vertex_company_id, 'Casey Wu', 'casey.wu@example.com', 'https://linkedin.com/in/casey-wu', 'Led growth from 0 to $2M ARR at previous startup. Strong data-driven approach.', 'recruiter@growthpartners.com', 'Maria (GrowthPartners)', 'pending');

end $$;
