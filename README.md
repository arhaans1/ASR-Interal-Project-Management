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
| Team (admin) | Team Settings › Manage Team | `/` | Every client card, tasks, chat and settings |
| Operator | Team Settings › Manage Team, role "Operator" | `/operator` | Only the clients assigned to them, with what is pending from the client and from our side |
| Client | The client card (username + password) | `/portal/<id>` | Their onboarding, then their project dashboard |

## Client onboarding and funnel types

- A client card has a **funnel type** (VSL, Webinar or CAM), an **operator**, and three links shown in the portal: Drive folder, Start Here video and On-Boarding Worksheet.
- Picking a funnel type pre-lists tasks on the card. CAM lists the full set from the On-Boarding Worksheet's "Total Deliverables" (8 client onboarding steps, 17 ASR tasks, 2 client recording tasks). VSL and Webinar list the client onboarding steps only. Templates live in `src/lib/funnelTemplates.ts`.
- Every task is done by the **team** or by the **client**. Use the person-with-tick icon on a task to switch it. Client tasks marked "Onboarding" must all be ticked before the client's dashboard opens.
- The client ticks their tasks in the portal. It is the same task row the team sees, so the tick shows on the team board and in the operator workspace within about 15 seconds.

### Database migration

Run `supabase-migration-client-onboarding.sql` once in the Supabase SQL Editor. It only adds columns (it is safe to re-run) and existing clients and tasks are left as they are.

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
