/**
 * @file Implements CLI commands for managing role model configurations
 */
import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import { CommandHandler, AgentCommand, CommandParam } from '../core/commands/decorators';
import { createRoleModelConfigManager } from '../mcp/tools/config/roleModelConfigFactory';
import { type Logger } from '../core/types/logger.types';
import { defaultRoleModelConfig } from '../mcp/tools/config/roleModelConfig';

@AgentCommand({
  name: 'role-model',
  description: 'Manage role-to-model configurations for LLM roles'
})
export class RoleModelConfigCommand {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Registers all role model config commands with Commander
   * @param program The Commander program instance
   */
  public registerCommands(program: Command): void {
    const roleModelCommand = program
      .command('role-model')
      .description('Manage role-to-model configurations for LLM roles');
    
    roleModelCommand
      .command('set-config')
      .description('Set the role model configuration file to use')
      .argument('<config-path>', 'Path to the role model configuration JSON file')
      .action((configPath: string) => this.setConfig(configPath));
    
    roleModelCommand
      .command('show-config')
      .description('Show the active role model configuration')
      .argument('[config-path]', 'Optional path to the role model configuration JSON file')
      .action((configPath?: string) => this.showConfig(configPath));
    
    roleModelCommand
      .command('export-template')
      .description('Export a template configuration file')
      .argument('<output-path>', 'Path to save the template configuration file')
      .action((outputPath: string) => this.exportTemplate(outputPath));
    
    roleModelCommand
      .command('validate')
      .description('Validate a role model configuration file')
      .argument('<config-path>', 'Path to the role model configuration JSON file')
      .action((configPath: string) => this.validateConfig(configPath));
  }

  @CommandHandler('set-config')
  public async setConfig(
    @CommandParam({ name: 'config-path', description: 'Path to the role model configuration JSON file' })
    configPath: string
  ): Promise<void> {
    // Check if the path exists
    if (!fs.existsSync(configPath)) {
      this.logger.error(`Configuration file not found: ${configPath}`);
      throw new Error('Process exited due to an error.');
    }

    // Validate the configuration file format
    const configManager = createRoleModelConfigManager(configPath);
    
    // If loading was successful, set the environment variable
    process.env.AGENTICMCP_ROLE_MODEL_CONFIG = path.resolve(configPath);
    
    this.logger.info(`Role model configuration set to: ${configPath}`);
    this.logger.info('Configuration will be used for future LLM role operations');
    this.logger.info('To make this persistent, add to your environment:');
    this.logger.info(`export AGENTICMCP_ROLE_MODEL_CONFIG=${path.resolve(configPath)}`);
  }

  @CommandHandler('show-config')
  public async showConfig(
    @CommandParam({ name: 'config-path', description: 'Optional path to the role model configuration JSON file', required: false })
    configPath?: string
  ): Promise<void> {
    // Use the specified path or the environment variable
    const configManager = createRoleModelConfigManager(
      configPath || process.env.AGENTICMCP_ROLE_MODEL_CONFIG
    );
    
    // Get the active configuration
    const config = configManager.getConfig();
    const configSource = configManager.getConfigPath() || 'default (built-in)';
    
    this.logger.info(`Active role model configuration source: ${configSource}`);
    this.logger.info('Configuration:');
    console.log(JSON.stringify(config, undefined, 2));
  }

  @CommandHandler('export-template')
  public async exportTemplate(
    @CommandParam({ name: 'output-path', description: 'Path to save the template configuration file' })
    outputPath: string
  ): Promise<void> {
    // Make sure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the default configuration as a template
    fs.writeFileSync(
      outputPath, 
      JSON.stringify(defaultRoleModelConfig, undefined, 2),
      'utf-8'
    );
    
    this.logger.info(`Template configuration exported to: ${outputPath}`);
    this.logger.info('You can customize this file and use it with:');
    this.logger.info(`agenticmcp role-model set-config ${outputPath}`);
  }

  @CommandHandler('validate')
  public async validateConfig(
    @CommandParam({ name: 'config-path', description: 'Path to the role model configuration JSON file' })
    configPath: string
  ): Promise<void> {
    // Check if the path exists
    if (!fs.existsSync(configPath)) {
      this.logger.error(`Configuration file not found: ${configPath}`);
      throw new Error('Process exited due to an error.');
    }

    // Try to load and validate the configuration
    const configManager = createRoleModelConfigManager(configPath);
    
    // Check if the config path was set, which indicates successful validation
    if (configManager.getConfigPath()) {
      this.logger.info(`✓ Configuration file is valid: ${configPath}`);
    } else {
      this.logger.error(`✗ Invalid configuration file: ${configPath}`);
      throw new Error('Process exited due to an error.');
    }
  }
}