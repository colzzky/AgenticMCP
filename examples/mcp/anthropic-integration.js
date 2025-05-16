/**
 * Example demonstrating integration with Anthropic's Claude via MCP
 * 
 * Prerequisites:
 * - AgenticMCP installed and available in PATH
 * - The @modelcontextprotocol/sdk package installed
 * - @anthropic-ai/sdk package installed
 * - ANTHROPIC_API_KEY environment variable set
 * 
 * Run this script with:
 * ANTHROPIC_API_KEY=your_key_here node anthropic-integration.js
 */

import { spawn } from 'node:child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Anthropic } from '@anthropic-ai/sdk';

// Helper function to create a simple message exchange with Claude
async function chatWithClaude(anthropic, messages) {
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: messages,
    system: 'You are a helpful assistant with expertise in file operations. Help the user manage their files and provide concise responses.',
    tools: [
      {
        name: 'read_file',
        description: 'Read the complete contents of a file from the file system',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'list_directory',
        description: 'List files in a directory',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to list'
            }
          },
          required: ['path']
        }
      }
    ]
  });
  
  return response;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
    throw new Error('Process exited with code: ' + 1);
  }
  
  let agenticProcess;
  
  try {
    console.log('Starting AgenticMCP in MCP mode (stdio transport)...');
    
    // Spawn AgenticMCP process
    agenticProcess = spawn('agenticmcp', ['serve-mcp'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    // Create MCP client connected to AgenticMCP
    const transport = new StdioClientTransport({
      stdin: agenticProcess.stdin,
      stdout: agenticProcess.stdout,
    });
    
    const mcpClient = new McpClient();
    await mcpClient.connect(transport);
    console.log('Connected to AgenticMCP MCP server');
    
    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey
    });
    
    // Start conversation with Claude
    console.log('Starting conversation with Claude...');
    const messages = [
      { role: 'user', content: 'What files are in the current directory? Then read the package.json file and tell me what dependencies this project has.' }
    ];
    
    const response = await chatWithClaude(anthropic, messages);
    console.log('Claude response:', response);
    
    // Handle tool use if Claude wants to use tools
    if (response.stop_reason === 'tool_use') {
      console.log('Claude wants to use a tool:', response.content);
      
      // Find the tool use request
      const toolUse = response.content.find(item => item.type === 'tool_use');
      if (toolUse) {
        console.log(`Executing tool "${toolUse.name}" with input:`, toolUse.input);
        
        try {
          // Call the appropriate tool via MCP
          const result = await mcpClient.callTool(toolUse.name, toolUse.input);
          console.log('Tool execution result:', result);
          
          // Send the tool result back to Claude
          const updatedMessages = [
            ...messages,
            { 
              role: 'assistant', 
              content: response.content.map(c => {
                if (c.type === 'tool_use') {
                  return {
                    type: 'tool_use',
                    id: c.id,
                    name: c.name,
                    input: c.input
                  };
                }
                return c;
              })
            },
            { 
              role: 'user', 
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result)
                }
              ]
            }
          ];
          
          // Get Claude's final response
          const finalResponse = await chatWithClaude(anthropic, updatedMessages);
          console.log('\nClaude\'s final response:');
          const finalText = finalResponse.content.find(c => c.type === 'text');
          if (finalText) {
            console.log(finalText.text);
          }
        } catch (error) {
          console.error('Error executing tool:', error);
        }
      }
    } else {
      // Claude didn't need to use tools
      const textContent = response.content.find(c => c.type === 'text');
      if (textContent) {
        console.log('\nClaude\'s response:');
        console.log(textContent.text);
      }
    }
    
    // Disconnect from MCP server
    await mcpClient.disconnect();
    console.log('Disconnected from MCP server');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    if (agenticProcess) {
      agenticProcess.kill();
      console.log('AgenticMCP process terminated');
    }
  }
}

await main();