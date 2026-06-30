<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Build commands (run before any commit):
- Backend: `cd backend && npm run build` (runs prisma generate + nest build)
- Frontend: `cd frontend && npm run build` (Next.js build)
- Database reset: `cd backend && npm run reset` (deletes all business data, preserves tenant/company/admin)
