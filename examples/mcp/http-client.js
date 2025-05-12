/**
 * Example script demonstrating how to use AgenticMCP in MCP mode with HTTP transport
 * 
 * Prerequisites:
 * - AgenticMCP installed and available in PATH
 * - The @modelcontextprotocol/sdk package installed
 * 
 * Run this script with:
 * node http-client.js
 */

import { spawn } from 'node:child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { HttpClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

let agenticProcess;

try {
    console.log('Starting AgenticMCP in MCP mode (HTTP transport)...');
    
    // Spawn AgenticMCP process with HTTP transport
    const port = 3456;
    agenticProcess = spawn('agenticmcp', ['serve-mcp', '--transport', 'http', '--port', port.toString()], {
      stdio: 'inherit'
    });
    
    // Give the server some time to start
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create MCP client with HTTP transport
    const transport = new HttpClientTransport({
      url: `http://localhost:${port}`
    });
    
    console.log(`Connecting MCP client to AgenticMCP server on http://localhost:${port}...`);
    const client = new McpClient();
    await client.connect(transport);
    
    console.log('Connected successfully! Fetching available tools...');
    const tools = await client.listTools();
    console.log('Available tools:');
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
    
    // Example: Create a new file
    const newFileName = `test-file-${Date.now()}.txt`;
    console.log(`\nCreating a new file: ${newFileName}...`);
    const writeResult = await client.callTool('write_file', {
      path: newFileName,
      content: 'This is a test file created by the MCP HTTP client example.'
    });
    console.log('File created:', writeResult);
    
    // Example: Read the file we just created
    console.log(`\nReading file ${newFileName}...`);
    const readResult = await client.callTool('read_file', {
      path: newFileName
    });
    console.log('File contents:', readResult.content);
    
    // Example: Search for the file we created
    console.log('\nSearching for the file...');
    const searchResult = await client.callTool('search_codebase', {
      query: 'test file created by the MCP HTTP client',
      recursive: true
    });
    console.log('Search results:');
    for (const result of searchResult.results) {
      console.log(`- Found in ${result.file} (line ${result.line_number}): ${result.line_content}`);
    }
    
    // Example: Delete the file
    console.log(`\nDeleting file ${newFileName}...`);
    const deleteResult = await client.callTool('delete_file', {
      path: newFileName
    });
    console.log('File deleted:', deleteResult);
    
    // Disconnect
    console.log('\nDisconnecting from MCP server...');
    await client.disconnect();
    console.log('Disconnected successfully.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up by killing the AgenticMCP process
    if (agenticProcess) {
      console.log('Terminating AgenticMCP process...');
      agenticProcess.kill();
    }
  }


await main();