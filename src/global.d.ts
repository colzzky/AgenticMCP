/**
 * Global type declarations for the application
 * These types augment the NodeJS.Global interface to include our global variables
 */

import { ToolRegistry } from './tools/toolRegistry';
import { ToolExecutor } from './tools/toolExecutor';
import { ToolResultFormatter } from './tools/toolResultFormatter';
import { ProviderFactory } from './providers/providerFactory';

declare global {
  var toolRegistry: ToolRegistry | undefined;
  var toolExecutor: ToolExecutor | undefined;
  var toolResultFormatter: ToolResultFormatter | undefined;
  var providerFactory: ProviderFactory | undefined;
}