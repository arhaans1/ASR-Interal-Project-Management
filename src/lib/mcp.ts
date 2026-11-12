import { supabase } from '@/lib/supabase';
import { fetchCategories, toPortalClient } from '@/lib/portalData';
import { formatDate, isClientTask, summarizeProject } from '@/lib/progress';
import { FUNNEL_TEMPLATES, funnelLabel } from '@/lib/funnelTemplates';
import { applyFunnelTemplate } from '@/lib/funnelSetup';
import { hashPassword } from '@/lib/passwords';
import { isUsernameTaken } from '@/lib/usernames';
import { FunnelType, PortalCategory, PortalClient, Task } from '@/types/database';

// The MCP server: lets an AI assistant (Claude, ChatGPT, Grok, ...) read project status,
// tick tasks and create new client cards. Plain JSON-RPC over HTTP POST ("Streamable HTTP", stateless).

const SERVER_INFO = { name: 'asr-project-management', version: '1.0.0' };
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

const safeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
};

// The key can arrive as "Authorization: Bearer <key>", as ?key=<key>, or as the last
// part of the URL (/api/mcp/<key>) for assistants that only accept a plain URL.
export function checkMcpAccess(request: Request, pathKey?: string): { ok: true } | { ok: false; status: number; message: string } {
    const expected = process.env.MCP_API_KEY || '';
    if (expected.length < 16) {
        return { ok: false, status: 503, message: 'The MCP server is switched off. Set MCP_API_KEY (16+ characters) in the server environment to enable it.' };
    }
    const header = request.headers.get('authorization') || '';
    const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    const query = new URL(request.url).searchParams.get('key') || '';
    const supplied = [bearer, pathKey || '', query].filter(Boolean);

    return supplied.some((key) => safeEqual(key, expected))
        ? { ok: true }
        : { ok: false, status: 401, message: 'Missing or wrong MCP key.' };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const TOOLS = [
    {
        name: 'list_projects',
        description:
            'List the client projects in ASR Media Pro\'s project management software, with each project\'s stage (Onboarding, In progress, Pending client approval, Complete), progress, operator and what is pending. Call this first to find the right project.',
        inputSchema: {
            type: 'object',
            properties: {
                include_archived: { type: 'boolean', description: 'Also include archived projects. Default false.' },
            },
        },
    },
    {
        name: 'get_project',
        description:
            'Get one client project in full: every phase with its status and due date, and every task with whether it is done and who does it (team or client). Use it to find the exact task before updating it.',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Client name, business name, or project id. Partial names work.' },
            },
            required: ['project'],
        },
    },
    {
        name: 'update_task',
        description:
            'Mark a task on a client project as complete, or reopen it. The change shows on the team board, the operator dashboard and the client\'s portal. ' +
            'When work has been submitted to the client (for example the course outline), mark that task complete: once everything before the approval step is done, the project stage becomes "Pending client approval". ' +
            'When the client approves, mark the approval task (for example "Review and approve the course outline") complete: the stage returns to "In progress" and the remaining due dates are set. ' +
            'Returns the project\'s new stage.',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Client name, business name, or project id.' },
                task: { type: 'string', description: 'Task name or task id. Partial names work if they match one task.' },
                completed: { type: 'boolean', description: 'true to mark complete, false to reopen. Default true.' },
            },
            required: ['project', 'task'],
        },
    },
    {
        name: 'list_operators',
        description:
            'List the team members who can run a client project (operators). Use it to find the exact operator name before calling create_client.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'create_client',
        description:
            'Create a new client project card, exactly like the "New client" form: the client name and business, the client\'s portal login (username and password), the operator who runs it, the funnel type and the three onboarding links. ' +
            'The funnel\'s full task list is added to the card automatically (about 9 onboarding steps plus the work phases). The client can sign in to the portal straight away with the username and password given. ' +
            'Call list_operators first and pass an exact operator name. If you do not know a link, leave it out rather than guessing. Returns the new card.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Client\'s name, e.g. "Kailash Pinjani".' },
                business_name: { type: 'string', description: 'Client\'s business name.' },
                username: { type: 'string', description: 'Portal login username. Must not already be used by another client or team member.' },
                password: { type: 'string', description: 'Portal login password, at least 8 characters.' },
                operator: { type: 'string', description: 'Operator name (or id) who runs this project. See list_operators.' },
                funnel_type: { type: 'string', enum: ['CAM', 'VSL', 'Webinar'], description: 'Funnel type. Default CAM (Community Ascension Model).' },
                drive_folder_url: { type: 'string', description: 'Client\'s Google Drive folder link (https://drive.google.com/...).' },
                assets_folder_url: { type: 'string', description: 'Link to the client\'s assets folder ("02 Clients Assets": logos, photos, testimonials). The logo, photo and testimonial upload steps open this. If omitted they open the main Drive folder.' },
                onboarding_video_url: { type: 'string', description: 'Link to the "Start Here" / worksheet fill-up video (Drive, YouTube, Loom or Vimeo).' },
                onboarding_form_url: { type: 'string', description: 'Link to the On-Boarding Worksheet (Google Doc).' },
            },
            required: ['name', 'business_name', 'username', 'password', 'operator'],
        },
    },
];

class ToolError extends Error { }

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Find one item by id, exact name, partial name, then shared words. Refuses to guess between several.
function pickOne<T>(items: T[], query: string, idOf: (item: T) => string, namesOf: (item: T) => string[], kind: string): T {
    const q = normalize(query);
    if (!q) throw new ToolError(`Say which ${kind} you mean.`);

    const byId = items.find((item) => idOf(item) === query.trim());
    if (byId) return byId;

    const describe = (list: T[]) => list.slice(0, 8).map((item) => `"${namesOf(item)[0]}"`).join(', ');
    const settle = (matches: T[]) => {
        if (matches.length === 1) return matches[0];
        if (matches.length > 1) throw new ToolError(`"${query}" matches more than one ${kind}: ${describe(matches)}. Use the exact name.`);
        return null;
    };

    const exact = settle(items.filter((item) => namesOf(item).some((n) => normalize(n) === q)));
    if (exact) return exact;
    const partial = settle(items.filter((item) => namesOf(item).some((n) => normalize(n).includes(q) || q.includes(normalize(n)))));
    if (partial) return partial;

    const words = q.split(' ').filter((w) => w.length > 2);
    const scored = items
        .map((item) => ({ item, score: words.filter((w) => namesOf(item).some((n) => normalize(n).includes(w))).length }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    if (scored.length > 0) {
        const best = scored.filter((x) => x.score === scored[0].score).map((x) => x.item);
        const one = settle(best);
        if (one) return one;
    }
    throw new ToolError(`No ${kind} matches "${query}".${items.length ? ` Available: ${describe(items)}.` : ''}`);
}

async function loadProjects(includeArchived = false) {
    const statuses = includeArchived ? ['Active', 'Launched', 'Archived'] : ['Active', 'Launched'];
    const { data: rows, error } = await supabase
        .from('clients')
        .select('*')
        .in('status', statuses)
        .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: users } = await supabase.from('users').select('id, username');
    const operatorName = (id: string | null) => (users || []).find((u: any) => u.id === id)?.username ?? null;

    return { clients: (rows || []).map(toPortalClient), operatorName };
}

function describeProject(client: PortalClient, categories: PortalCategory[], operator: string | null, detailed: boolean) {
    const summary = summarizeProject(categories);
    const nextDue = summary.phases.find((p) => p.status !== 'done' && p.status !== 'awaiting' && p.dueDate);
    const phaseStatus = { done: 'Completed', active: 'In progress', awaiting: 'Pending client approval', upcoming: 'Upcoming' };

    return {
        id: client.id,
        client: client.name,
        business: client.business_name,
        status: client.status,
        funnel: funnelLabel(client.funnel_type),
        operator,
        stage: summary.stage.label,
        progress: `${summary.done} of ${summary.total} tasks done (${summary.percent}%)`,
        onboarding: summary.hasOnboarding ? `${summary.onboardingDone} of ${summary.onboardingTasks.length} steps done` : 'No onboarding steps',
        pending_from_client: summary.clientPending.map((t) => t.name),
        pending_on_our_end: summary.teamPending.length,
        next_due: nextDue ? `${nextDue.name}: ${nextDue.dueKind === 'submit' ? 'submit for client approval by ' : ''}${formatDate(nextDue.dueDate)}${nextDue.overdue ? ' (overdue)' : ''}` : null,
        ...(detailed
            ? {
                phases: summary.phases.map((phase) => ({
                    name: phase.name,
                    status: phaseStatus[phase.status],
                    due: phase.dueDate ? formatDate(phase.dueDate) : phase.dueHint,
                    completed_on: phase.completedAt ? formatDate(phase.completedAt) : null,
                    tasks: phase.tasks.map((t) => ({
                        id: t.id,
                        name: t.name,
                        done: t.completed,
                        done_by: isClientTask(t) ? 'client' : 'team',
                        ...(t.is_approval ? { client_approval_step: true } : {}),
                        ...(t.completed_at ? { completed_on: formatDate(t.completed_at) } : {}),
                    })),
                })),
            }
            : {}),
    };
}

async function callTool(name: string, args: Record<string, any>) {
    if (name === 'list_projects') {
        const { clients, operatorName } = await loadProjects(Boolean(args.include_archived));
        const categories = await fetchCategories(clients.map((c) => c.id));
        return clients.map((client) =>
            describeProject(client, categories.filter((c) => c.client_id === client.id), operatorName(client.operator_id), false)
        );
    }

    if (name === 'get_project' || name === 'update_task') {
        const { clients, operatorName } = await loadProjects(true);
        const client = pickOne(clients, String(args.project ?? ''), (c) => c.id, (c) => [c.name, c.business_name], 'project');
        let categories = await fetchCategories([client.id]);

        if (name === 'get_project') {
            return describeProject(client, categories, operatorName(client.operator_id), true);
        }

        const tasks = categories.flatMap((c) => c.tasks);
        const task: Task = pickOne(tasks, String(args.task ?? ''), (t) => t.id, (t) => [t.name], 'task');
        const completed = args.completed === undefined ? true : Boolean(args.completed);
        const before = summarizeProject(categories).stage.label;

        if (task.completed !== completed) {
            const { error } = await supabase
                .from('tasks')
                .update({ completed, completed_at: completed ? new Date().toISOString() : null })
                .eq('id', task.id);
            if (error) throw error;
            categories = await fetchCategories([client.id]);
        }

        const project = describeProject(client, categories, operatorName(client.operator_id), false);
        return {
            result:
                task.completed === completed
                    ? `"${task.name}" was already ${completed ? 'complete' : 'open'}. Nothing changed.`
                    : `"${task.name}" is now ${completed ? 'complete' : 'open'} on ${client.name}'s project.`,
            stage_before: before,
            stage_now: project.stage,
            project,
        };
    }

    if (name === 'list_operators') {
        return (await loadOperators()).map((u) => ({ id: u.id, name: u.username }));
    }

    if (name === 'create_client') return createClientCard(args);

    throw new ToolError(`Unknown tool: ${name}`);
}

async function loadOperators(): Promise<{ id: string; username: string }[]> {
    const { data, error } = await supabase.from('users').select('id, username, role').in('role', ['operator', 'member_operator']);
    if (error) throw error;
    return (data || []) as { id: string; username: string }[];
}

const cleanText = (value: unknown, label: string, max = 200) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw new ToolError(`${label} is required.`);
    if (text.length > max) throw new ToolError(`${label} is too long (max ${max} characters).`);
    return text;
};

const cleanUrl = (value: unknown, label: string): string | null => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const text = String(value).trim();
    try {
        const url = new URL(text);
        if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
    } catch { /* falls through */ }
    throw new ToolError(`${label} must be a full link starting with https://`);
};

async function createClientCard(args: Record<string, any>) {
    const name = cleanText(args.name, 'name');
    const businessName = cleanText(args.business_name, 'business_name');
    const username = cleanText(args.username, 'username', 60);
    const password = typeof args.password === 'string' ? args.password.trim() : '';
    if (password.length < 8) throw new ToolError('password must be at least 8 characters.');
    if (password.length > 200) throw new ToolError('password is too long.');

    const funnel = (args.funnel_type ?? 'CAM') as FunnelType;
    if (!(funnel in FUNNEL_TEMPLATES)) throw new ToolError('funnel_type must be CAM, VSL or Webinar.');

    const drive = cleanUrl(args.drive_folder_url, 'drive_folder_url');
    const assets = cleanUrl(args.assets_folder_url, 'assets_folder_url');
    const video = cleanUrl(args.onboarding_video_url, 'onboarding_video_url');
    const form = cleanUrl(args.onboarding_form_url, 'onboarding_form_url');

    const operators = await loadOperators();
    if (operators.length === 0) throw new ToolError('There are no operators yet. Create one in Team Settings › Manage Team first.');
    const operator = pickOne(operators, String(args.operator ?? ''), (u) => u.id, (u) => [u.username], 'operator');

    // Sign-in looks the username up in team accounts first, then clients, so it must be unique across both.
    if (await isUsernameTaken(username)) {
        throw new ToolError(`The username "${username}" is already taken. Choose a different one.`);
    }

    const { data: created, error } = await supabase
        .from('clients')
        .insert({
            name,
            business_name: businessName,
            status: 'Active',
            important_links: '',
            notes: '',
            username,
            password: hashPassword(password),
            funnel_type: funnel,
            operator_id: operator.id,
            ...(drive ? { drive_folder_url: drive } : {}),
            ...(assets ? { assets_folder_url: assets } : {}),
            ...(video ? { onboarding_video_url: video } : {}),
            ...(form ? { onboarding_form_url: form } : {}),
        })
        .select('id')
        .single();
    if (error) throw error;

    try {
        await applyFunnelTemplate(created.id, funnel);
    } catch (err) {
        // Do not leave a half-made card behind.
        await supabase.from('clients').delete().eq('id', created.id);
        throw err;
    }

    const { clients, operatorName } = await loadProjects(true);
    const client = clients.find((c) => c.id === created.id);
    if (!client) throw new Error('Created client could not be read back.');
    const categories = await fetchCategories([client.id]);

    return {
        result: `Created ${name} (${businessName}) on a ${funnelLabel(funnel)} project, run by ${operator.username}. They can sign in to the client portal with username "${username}" and the password you set.`,
        links_set: {
            drive_folder: Boolean(drive),
            assets_folder: Boolean(assets),
            onboarding_video: Boolean(video),
            onboarding_worksheet: Boolean(form),
        },
        project: describeProject(client, categories, operatorName(client.operator_id), false),
    };
}

// ---------------------------------------------------------------------------
// JSON-RPC
// ---------------------------------------------------------------------------

type RpcMessage = { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };

const rpcError = (id: RpcMessage['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function handleMessage(message: RpcMessage) {
    const isNotification = message.id === undefined || message.id === null;
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return isNotification ? null : rpcError(message?.id, -32600, 'Invalid request');
    }
    // Notifications (such as notifications/initialized) get no reply.
    if (isNotification) return null;

    const reply = (result: unknown) => ({ jsonrpc: '2.0', id: message.id, result });

    switch (message.method) {
        case 'initialize': {
            const requested = message.params?.protocolVersion;
            return reply({
                protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
                capabilities: { tools: {} },
                serverInfo: SERVER_INFO,
                instructions:
                    'Project status for ASR Media Pro client projects. Find the project with list_projects, read it with get_project, and record progress with update_task. Always confirm the project and task names from the tool results before updating. To onboard a new client, call list_operators, then create_client.',
            });
        }
        case 'ping':
            return reply({});
        case 'tools/list':
            return reply({ tools: TOOLS });
        case 'tools/call': {
            const name = message.params?.name;
            try {
                const result = await callTool(name, message.params?.arguments ?? {});
                return reply({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
            } catch (err: any) {
                if (!(err instanceof ToolError)) console.error('MCP tool error:', err);
                // Tool problems go back to the assistant as a result it can read and act on.
                return reply({
                    content: [{ type: 'text', text: err instanceof ToolError ? err.message : 'The project software could not complete this request.' }],
                    isError: true,
                });
            }
        }
        default:
            return rpcError(message.id, -32601, `Method not found: ${message.method}`);
    }
}

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export async function handleMcpPost(request: Request, pathKey?: string): Promise<Response> {
    const access = checkMcpAccess(request, pathKey);
    if (!access.ok) return json(rpcError(null, -32001, access.message), access.status);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json(rpcError(null, -32700, 'Parse error'), 400);
    }

    if (Array.isArray(body)) {
        const replies = (await Promise.all(body.map((m) => handleMessage(m)))).filter(Boolean);
        return replies.length > 0 ? json(replies) : new Response(null, { status: 202, headers: CORS });
    }

    const reply = await handleMessage(body as RpcMessage);
    return reply ? json(reply) : new Response(null, { status: 202, headers: CORS });
}

// This server answers each POST directly and keeps no open stream.
export const mcpMethodNotAllowed = () =>
    new Response(JSON.stringify(rpcError(null, -32000, 'Use POST')), {
        status: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'POST, OPTIONS', ...CORS },
    });

export const mcpOptions = () => new Response(null, { status: 204, headers: CORS });
