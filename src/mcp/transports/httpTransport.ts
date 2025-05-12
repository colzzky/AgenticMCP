import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import type { Logger } from '../../core/types/logger.types.js';

/**
 * Configuration options for HttpTransport
 */
export interface HttpTransportConfig {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Host to bind to (default: localhost) */
  host?: string;
  /** Enable CORS (default: false) */
  cors?: boolean;
}

/**
 * Wrapper around the MCP SDK's HttpServerTransport with additional logging
 * and configuration options.
 */
export class HttpTransport {
  private transport: HttpServerTransport;
  private logger: Logger;
  private port: number;
  private host: string;

  /**
   * Creates a new HTTP transport for MCP server
   * 
   * @param config Configuration options 
   * @param logger Logger instance for logging
   */
  constructor(config: HttpTransportConfig = {}, logger: Logger) {
    this.port = config.port || 3000;
    this.host = config.host || 'localhost';
    
    this.transport = new HttpServerTransport({
      port: this.port,
      host: this.host,
      cors: config.cors || false
    });
    
    this.logger = logger;
    this.logger.info(`HTTP transport initialized on ${this.host}:${this.port}`);
  }

  /**
   * Gets the underlying MCP SDK HttpServerTransport instance
   * 
   * @returns The HttpServerTransport instance
   */
  public getTransport(): HttpServerTransport {
    return this.transport;
  }
  
  /**
   * Gets the port this transport is listening on
   * 
   * @returns The port number
   */
  public getPort(): number {
    return this.port;
  }
  
  /**
   * Gets the host this transport is bound to
   * 
   * @returns The host address
   */
  public getHost(): string {
    return this.host;
  }
}