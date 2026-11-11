# ASR Media Pro - Project Management

A clean, minimal single-page project management application for ASR Media Pro's internal use.

## Features

- **Client Management**: Add, edit, and organize clients
- **Status Tracking**: Track client status (Onboarding, In-Process, On-Hold, Ads Launched, Closed)
- **Task Management**: Create categories and tasks with checkbox completion
- **Important Links**: Store important links that are automatically clickable
- **Notes**: Simple text notes for each client
- **Clone Functionality**: Clone clients with all their tasks and data
- **Active/Inactive Sections**: Automatically organize clients by status

## Logins

One login page, three kinds of account:

| Account | Created in | Lands on | Sees |
| --- | --- | --- | --- |
| Team member | Team Settings › Manage Team | `/` | Every client card, tasks, chat and settings |
| Operator | Team Settings › Manage Team, role "Operator" | `/operator` | Everything a team member sees, plus their own operator dashboard: the clients assigned to them, with what is pending from the client and from our side. A switcher at the top moves between the two |
| Client | The client card (username + password) | `/portal/<id>`, after signing in at `/client-login` | Their onboarding, then their project dashboard |

Every client uses the same address, `/client-login`, and lands on their own portal. **Share Portal** on a client card copies that address.

Users and their roles can be edited in Team Settings › Manage Team. Team members cannot open the operator dashboard.

### Security

- Passwords are stored hashed (scrypt). Older plain-text passwords are replaced with a hash the first time that person signs in. Stored passwords are never shown again; type a new one to change it.
- The browser never talks to the database directly. The team workspace reads and writes through `/api/db`, which checks the signed-in team session and then uses the service role key on the server. `SUPABASE_SERVICE_ROLE_KEY` must be set.
- After that version is live, run `supabase-migration-lockdown.sql`. It switches on row level security with no public policies, so the anon key inside the website can no longer read or change any table.
- The login cookie is signed with `SESSION_SECRET`, so it cannot be edited or forged. Set `SESSION_SECRET` to a long random string in the server environment. If it is missing, `SUPABASE_SERVICE_ROLE_KEY` is used to sign instead; if both are missing, nobody can sign in.

## Client onboarding and funnel types

- A client card has a **funnel type** (VSL, Webinar or CAM), an **operator**, and three links shown in the portal: Drive folder, Start Here video and On-Boarding Worksheet.
- Picking a funnel type pre-lists tasks on the card. CAM lists the full set from the On-Boarding Worksheet's "Total Deliverables". VSL and Webinar list the client onboarding steps plus their own deliverables. Templates live in `src/lib/funnelTemplates.ts`.
- Every task is done by the **team** or by the **client**. Use the person-with-tick icon on a task to switch it. Client tasks marked "Onboarding" must all be ticked before the client's dashboard opens.
- The client ticks their tasks in the portal. It is the same task row the team sees, so the tick shows on the team board and in the operator workspace within about 15 seconds.

## Timelines and client approval

Phases can carry a due date that is counted in business days (Saturdays and Sundays skipped) from a point in the project. On the CAM template:

1. **Research, Strategy & Course Outline** is due 3 business days after the client finishes onboarding.
2. When that phase is done, the project shows **Pending client approval** until "Review and approve the course outline" is ticked (by the client in their portal, or by the team on their behalf).
3. **Course Creation, Copy & Creatives and Build & Setup** are due 5 business days after that approval.

Dates are worked out from when things were actually ticked, so they move with the client. VSL and Webinar follow the same rules: copy and script due 3 business days after onboarding, a client approval step, then ad creatives and the funnel build due 5 business days after approval.

## MCP server (AI assistants)

`/api/mcp` is an MCP server (Streamable HTTP) so Claude, ChatGPT and other assistants can read project status and tick tasks.

- Set `MCP_API_KEY` (16+ characters) in the server environment. Without it the endpoint is off.
- Connect with `https://<your-domain>/api/mcp` and the header `Authorization: Bearer <MCP_API_KEY>`, or, for assistants that only take a URL, `https://<your-domain>/api/mcp/<MCP_API_KEY>`. Anyone with that URL can update tasks, so treat it like a password.
- Tools: `list_projects`, `get_project`, `update_task`.
- Example: "the course outline for Quantseekho has been submitted" → the assistant ticks the outline task and the stage becomes Pending client approval. "The client approved it" → it ticks the approval task, the stage returns to In progress and the remaining due dates are set.

### Database migrations

Run these once each, in order, in the Supabase SQL Editor. They only add columns, are safe to re-run, and leave existing clients and tasks as they are.

1. `supabase-migration-client-onboarding.sql`
2. `supabase-migration-timelines.sql`
3. `supabase-migration-lockdown.sql` — only after the app version that uses `/api/db` is deployed (see Security)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd ASR-Interal-Project-Management
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL from `supabase-schema.sql` to create the required tables
4. Go to Project Settings > API to get your credentials

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SESSION_SECRET=a_long_random_string
MCP_API_KEY=another_long_random_string   # optional, turns on the MCP server
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database Schema

### Tables

- **clients**: Stores client information (name, business_name, status, links, notes)
- **categories**: Task categories belonging to clients
- **tasks**: Individual tasks within categories

### Status Values

- `Onboarding` - New clients being onboarded
- `In-Process` - Active work in progress
- `On-Hold` - Temporarily paused (shows in Inactive)
- `Ads Launched` - Advertising campaigns live
- `Closed` - Completed/closed clients (shows in Inactive)

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add the environment variables in Vercel's project settings
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page component
├── components/
│   ├── ClientDetail.tsx # Client detail view
│   ├── ClientModal.tsx  # Create/edit client modal
│   ├── Sidebar.tsx      # Left sidebar with client list
│   ├── TaskSection.tsx  # Tasks with categories
│   └── TextBox.tsx      # Reusable text box component
├── hooks/
│   ├── useClients.ts    # Client data management
│   └── useCategories.ts # Categories & tasks management
├── lib/
│   └── supabase.ts      # Supabase client
└── types/
    └── database.ts      # TypeScript types
```

## License

Private - ASR Media Pro Internal Use Only
