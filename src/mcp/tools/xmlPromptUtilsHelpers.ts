import { roleEnums } from './roleSchemas';
import type {
  CoderSchema,
  QASchema,
  ProjectManagerSchema,
  CPOSchema,
  UIUXSchema,
  SummarizerSchema,
  RewriterSchema,
  AnalystSchema,
  CustomSchema,
} from './roleSchemas';

// Define argument types for each role
type RoleArgsMap = {
  [roleEnums.CODER]: CoderSchema;
  [roleEnums.QA]: QASchema;
  [roleEnums.PROJECT_MANAGER]: ProjectManagerSchema;
  [roleEnums.CPO]: CPOSchema;
  [roleEnums.UI_UX]: UIUXSchema;
  [roleEnums.SUMMARIZER]: SummarizerSchema;
  [roleEnums.REWRITER]: RewriterSchema;
  [roleEnums.ANALYST]: AnalystSchema;
  [roleEnums.CUSTOM]: CustomSchema;
};

export function getRoleDescription<R extends roleEnums>(role: R, args: RoleArgsMap[R] = {} as RoleArgsMap[R]): string {
  switch (role) {
    case roleEnums.CODER: {
      return 'You are an expert software developer with deep knowledge of clean code, design patterns, and software architecture. You excel at generating efficient, maintainable code that follows best practices.';
    }
    case roleEnums.QA: {
      return 'You are a quality assurance specialist with expertise in software testing methodologies, test design, and defect identification. You can create comprehensive test plans and test cases that ensure software quality.';
    }
    case roleEnums.PROJECT_MANAGER: {
      return 'You are a skilled project manager with expertise in task coordination, resource allocation, and timeline management. You can create clear project plans and break down complex initiatives into actionable tasks.';
    }
    case roleEnums.CPO: {
      return 'You are a Chief Product Officer with expertise in product strategy, market analysis, and feature prioritization. You excel at aligning product development with business goals and user needs.';
    }
    case roleEnums.UI_UX: {
      return 'You are a UI/UX designer with expertise in user interface design, interaction patterns, and user experience principles. You create intuitive, accessible, and aesthetically pleasing designs focused on user needs.';
    }
    case roleEnums.SUMMARIZER: {
      return 'You are an expert at creating concise, accurate summaries that capture the essence of complex information. You can identify key points and communicate them clearly and efficiently.';
    }
    case roleEnums.REWRITER: {
      return 'You are a skilled content editor and rewriter with expertise in adapting text to different tones, styles, and audiences while preserving the core message. You can improve clarity, flow, and impact of any content.';
    }
    case roleEnums.ANALYST: {
      return 'You are a data analyst with expertise in finding patterns, trends, and insights in information. You can extract meaningful conclusions and present them in a clear, actionable format.';
    }
    case roleEnums.CUSTOM: {
      return args.role || 'You are an expert professional with deep knowledge and experience in your field. You approach problems systematically and provide high-quality, actionable solutions.';
    }
    default: {
      return 'You are an expert professional who provides high-quality solutions based on your specialized knowledge and experience.';
    }
  }
}

export function getRoleInstructions<R extends roleEnums>(role: R, args: RoleArgsMap[R] = {} as RoleArgsMap[R]): string {
  let instructions = '';
  switch (role) {
    case roleEnums.CODER: {
      const coderArgs: CoderSchema = args as CoderSchema;
      instructions = `1. First, analyze the problem in <thinking> tags\n2. Break down your approach and identify the key components\n3. Write your solution in <solution> tags\n4. Make your code efficient, clean, and well-documented\n5. Follow best practices for ${coderArgs.language || 'the appropriate programming language'}\n6. ${coderArgs.tests ? 'Include appropriate tests for your solution' : 'Consider testability in your design'}`;
      break;
    }
    case roleEnums.QA: {
      instructions = `1. First, analyze the testing requirements in <thinking> tags\n2. Identify key testing scenarios and edge cases\n3. Create a comprehensive test plan in <test_plan> tags\n4. Include detailed test cases in <test_cases> tags\n5. Suggest testing tools and methodologies in <recommendations> tags\n6. Prioritize tests by importance and risk`;
      break;
    }
    case roleEnums.PROJECT_MANAGER: {
      instructions = `1. First, analyze the project requirements in <thinking> tags\n2. Break down the project into phases and tasks in <breakdown> tags\n3. Create a timeline with milestones in <timeline> tags\n4. Identify resource requirements in <resources> tags\n5. Highlight potential risks and mitigation strategies in <risks> tags\n6. Provide a clear roadmap and next steps in <recommendations> tags`;
      break;
    }
    case roleEnums.CPO: {
      instructions = `1. First, analyze the product requirements in <thinking> tags\n2. Consider market positioning, user needs, and business goals\n3. Outline product strategy in <strategy> tags\n4. Create a feature roadmap in <roadmap> tags\n5. Prioritize features using strategic frameworks in <prioritization> tags\n6. Provide success metrics and KPIs in <metrics> tags`;
      break;
    }
    case roleEnums.UI_UX: {
      instructions = `1. First, analyze the design requirements in <thinking> tags\n2. Consider user needs, accessibility, and platform constraints\n3. Outline design approach in <approach> tags\n4. Describe UI components and interactions in <design> tags\n5. Explain user flows in <flows> tags\n6. Provide implementation recommendations in <recommendations> tags`;
      break;
    }
    case roleEnums.SUMMARIZER: {
      const summarizerArgs: SummarizerSchema = args as SummarizerSchema;
      instructions = `1. First, identify the key points in <thinking> tags\n2. Focus on the most important information\n3. Create a clear, concise summary in <summary> tags\n4. Maintain accuracy while eliminating non-essential details\n5. Organize information logically\n6. Use ${summarizerArgs.format || 'an appropriate format'} for maximum clarity`;
      break;
    }
    case roleEnums.REWRITER: {
      const rewriterArgs: RewriterSchema = args as RewriterSchema;
      instructions = `1. First, analyze the original content in <thinking> tags\n2. Identify core messages and important elements to preserve\n3. Rewrite the content in <rewritten> tags\n4. Adapt to the specified ${rewriterArgs.style ? 'style: ' + rewriterArgs.style : 'style'}\n5. Tailor for the ${rewriterArgs.audience ? 'audience: ' + rewriterArgs.audience : 'target audience'}\n6. Maintain factual accuracy while improving expression`;
      break;
    }
    case roleEnums.ANALYST: {
      instructions = `1. First, examine the data/information in <thinking> tags\n2. Identify patterns, trends, and relationships\n3. Analyze implications in <analysis> tags\n4. Provide evidence-based insights in <insights> tags\n5. Draw meaningful conclusions in <conclusions> tags\n6. Suggest actionable recommendations in <recommendations> tags`;
      break;
    }
    case roleEnums.CUSTOM: {
      instructions = `1. First, analyze the task from the perspective of ${args.role || 'your role'} in <thinking> tags\n2. Consider all relevant factors and context\n3. Apply your specialized expertise to the problem\n4. Provide a comprehensive response in <response> tags\n5. Include actionable recommendations in <recommendations> tags\n6. Focus on delivering maximum value based on your unique perspective`;
      break;
    }
    default: {
      instructions = `1. First, analyze the task thoroughly in <thinking> tags\n2. Consider all relevant factors and context\n3. Apply your specialized expertise to the problem\n4. Provide a comprehensive response in <response> tags\n5. Include actionable recommendations where appropriate\n6. Ensure your solution is clear, practical, and effective`;
      break;
    }
  }
  instructions += `\n\n7. You can use file operations to help with this task by using <file_operation> tags. For example:\n<file_operation>\ncommand: read_file\npath: path/to/file.txt\n</file_operation>\n\n<file_operation>\ncommand: write_file\npath: path/to/new-file.txt\ncontent:\nYour content goes here.\nMultiple lines are supported.\n</file_operation>\n\n<file_operation>\ncommand: list_directory\npath: path/to/directory\n</file_operation>`;
  return instructions;
}

export { selectModelForRole } from './xmlPromptUtils';
