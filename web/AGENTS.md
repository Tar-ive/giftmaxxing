<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:privacy-page-rule -->
# Never delete the privacy statement

`web/app/privacy/page.tsx` is a REQUIRED, user-mandated page (the data-protection
statement). Do NOT delete it, empty it, or remove its `PRIVACY-GUARD-DO-NOT-DELETE`
marker or its data-ownership / PII-redaction / no-third-party sections. It is enforced by
CI (`.github/workflows/ci.yml`) and linked from the invite flow (`/privacy#sender`,
`/privacy#recipient`). You may improve the wording, but keep the page and marker intact.
<!-- END:privacy-page-rule -->

