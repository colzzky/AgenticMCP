import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Logger } from '../../core/types/logger.types.js';

/**
 * Configuration options for StdioTransport
 */
export interface StdioTransportConfig {
  /** Optional custom input stream (defaults to process.stdin) */
  input?: NodeJS.ReadableStream;
  /** Optional custom output stream (defaults to process.stdout) */
  output?: NodeJS.WritableStream;
}

/**
 * Wrapper around the MCP SDK's StdioServerTransport with additional logging
 * and configuration options.
 */
export class StdioTransport {
  private transport: StdioServerTransport;
  private logger: Logger;

  /**
   * Creates a new stdio transport for MCP server
   * 
   * @param config Configuration options 
   * @param logger Logger instance for logging
   */
  constructor(config: StdioTransportConfig = {}, logger: Logger) {
    this.transport = new StdioServerTransport({
      stdin: config.input, 
      stdout: config.output
    });
    
    this.logger = logger;
    this.logger.info('Stdio transport initialized');
  }

  /**
   * Gets the underlying MCP SDK StdioServerTransport instance
   * 
   * @returns The StdioServerTransport instance
   */
  public getTransport(): StdioServerTransport {
    return this.transport;
  }
}