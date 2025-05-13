import { McpServer } from "./mcpServer";
import { McpServer as BaseMcpServerRaw, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Implementation } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export type McpServerType = typeof McpServer;
export type McpServerConfig = Implementation;
export type McpServerTransport = typeof StdioServerTransport;
export type BaseMcpServer = typeof BaseMcpServerRaw;
export type BaseMcpServerInstance = BaseMcpServerRaw;
