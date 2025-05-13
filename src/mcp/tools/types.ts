import type { PathDI } from '../../global.types';
import type { Logger } from '../../core/types/logger.types';

export interface RoleBasedToolsRegistrar {
    register(
        server: any,
        logger: Logger,
        provider: any,
        pathDI: PathDI
    ): void;
}