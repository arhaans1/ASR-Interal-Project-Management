import { handleMcpPost, mcpMethodNotAllowed, mcpOptions } from '@/lib/mcp';

// Same MCP endpoint, with the key as part of the URL: /api/mcp/<MCP_API_KEY>.
// For assistants whose connector setup only takes a URL.
export const dynamic = 'force-dynamic';

interface Context {
    params: Promise<{ key: string }>;
}

export async function POST(request: Request, { params }: Context) {
    const { key } = await params;
    return handleMcpPost(request, key);
}
export const GET = () => mcpMethodNotAllowed();
export const DELETE = () => mcpMethodNotAllowed();
export const OPTIONS = () => mcpOptions();
