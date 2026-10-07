# FaceMeX SEO keyword map

Public content describes FaceMeX as an AI workspace for learning and career preparation. It does not describe FaceMeX as a social or professional networking platform.

| Canonical URL | Primary topic | Supporting topics |
|---|---|---|
| `/` | FaceMeX AI learning and career assistant | AI learning workspace, job discovery, CV support, interview preparation |
| `/ai-for-students` | AI for students | AI learning assistant, student study support, practical learning |
| `/ai-study-assistant` | AI study assistant | AI study help, revision support, lesson summaries |
| `/student-career-guidance` | Career guidance for students | career exploration, student CV, interview practice |
| `/online-learning` | Online learning support | AI-assisted learning, lesson review, practical learning activities |
| `/ai-career-assistant` | AI career assistant | CV preparation, job search support, interview preparation |
| `/jobs-in-south-africa` | Job search tools for South Africa | job discovery, verify job listings, application safety |
| `/about` | About FaceMeX | AI learning workspace, career preparation tools |
| `/resources` | Learning and career guides | student study, CV writing, interview preparation, job search |
| `/resources/how-can-ai-help-students` | How AI can help students learn | AI for students, AI study assistant |
| `/resources/how-to-use-ai-for-studying` | How to use AI for studying | focused prompts, revision, active recall |
| `/resources/how-to-write-a-student-cv` | How to write a student CV | student applications, CV review |
| `/resources/how-to-prepare-for-an-interview` | How to prepare for a job interview | interview practice, career preparation |
| `/resources/how-to-choose-a-career` | How to choose a career path | career exploration, student career guidance |
| `/resources/how-ai-can-help-job-seekers` | How AI can help job seekers | CV tailoring, job search, interview practice |
| `/resources/how-to-find-jobs-in-south-africa` | How to find jobs in South Africa | job search, application safety |
| `/resources/how-to-build-career-skills` | How to build career skills | practical projects, employability skills |

## Route and indexing notes

- The existing `/jobs` route is an authenticated application feature. It remains unchanged and is not in the public sitemap; public job-search information is at `/jobs-in-south-africa`.
- `/ai/job-assistant`, project conversations, account features and other private application routes are not public SEO landing pages.
- No `/professional-networking` page is created because networking is not part of the current product positioning.
- `/contact` is not published until an official contact method is provided.
- Existing `/privacy` and `/tos` documents contain legacy social-platform wording. They remain available to the application but are excluded from the sitemap and marked `noindex` until reviewed and updated with verified current practices.

## Search Console and analytics setup

1. Verify `https://facemexsocial.com/` in Google Search Console using a site-owner-approved verification method.
2. Confirm HTTPS and canonical-domain redirects at the host, then submit `https://facemexsocial.com/sitemap.xml`.
3. Inspect the public landing pages and a resource article with URL Inspection; verify the rendered page, canonical, robots directive and structured data.
4. Review the current privacy notice and publish a verified contact channel before including those pages in the sitemap.
5. Optional GA4 support is gated by the `VITE_GA_MEASUREMENT_ID` build variable and explicit opt-in in the public-site footer. Leave it unset if GA4 is not approved. Event payloads use a field allowlist and exclude prompt text, identifiers, search strings and query parameters.
