import type { PathDI } from '../../types/global.types';
import type { Logger } from '../../core/types/logger.types';
import { McpServer } from '../mcpServer';

export interface RoleBasedToolsRegistrar {
    register(
        server: McpServer,
        logger: Logger,
        provider: any,
        pathDI: PathDI
    ): McpServer;
}