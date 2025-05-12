/**
 * Example script demonstrating how to use AgenticMCP in MCP mode with stdio transport
 * 
 * Prerequisites:
 * - AgenticMCP installed and available in PATH
 * - The @modelcontextprotocol/sdk package installed
 * 
 * Run this script with:
 * node stdio-client.js
 */

import { spawn } from 'node:child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  try {
    console.log('Starting AgenticMCP in MCP mode (stdio transport)...');
    
    // Spawn AgenticMCP process with stdio transport
    const agenticProcess = spawn('agenticmcp', ['serve-mcp'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    // Create MCP client with stdio transport
    const transport = new StdioClientTransport({
      stdin: agenticProcess.stdin,
      stdout: agenticProcess.stdout,
    });
    
    console.log('Connecting MCP client to AgenticMCP server...');
    const client = new McpClient();
    await client.connect(transport);
    
    console.log('Connected successfully! Fetching available tools...');
    const tools = await client.listTools();
    console.log('Available tools:');
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
    
    // Example: List files in the current directory
    console.log('\nListing files in the current directory...');
    const listResult = await client.callTool('list_directory', {
      path: '.'
    });
    console.log('Files in current directory:');
    for (const entry of listResult.entries) {
      console.log(`${entry.type === 'directory' ? 'Dir ' : 'File'} ${entry.name}`);
    }
    
    // Example: Read a file (package.json)
    console.log('\nReading package.json...');
    const readResult = await client.callTool('read_file', {
      path: 'package.json'
    });
    console.log('Contents of package.json:');
    console.log(readResult.content.slice(0, 200) + '...');
    
    // Disconnect and clean up
    console.log('\nDisconnecting from MCP server...');
    await client.disconnect();
    
    // Kill the AgenticMCP process
    agenticProcess.kill();
    console.log('AgenticMCP process terminated.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

await main();