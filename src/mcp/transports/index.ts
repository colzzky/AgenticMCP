export { StdioTransport, type StdioTransportConfig } from './stdioTransport.js';
export { HttpTransport, type HttpTransportConfig } from './httpTransport.js';

/**
 * Enum representing the available transport types for MCP servers
 */
export enum TransportType {
  STDIO = 'stdio',
  HTTP = 'http'
}