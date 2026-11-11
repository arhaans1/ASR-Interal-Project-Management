import { handleMcpPost, mcpMethodNotAllowed, mcpOptions } from '@/lib/mcp';

// MCP endpoint. Send the key as "Authorization: Bearer <MCP_API_KEY>" or ?key=<MCP_API_KEY>.
export const dynamic = 'force-dynamic';

export const POST = (request: Request) => handleMcpPost(request);
export const GET = () => mcpMethodNotAllowed();
export const DELETE = () => mcpMethodNotAllowed();
export const OPTIONS = () => mcpOptions();
