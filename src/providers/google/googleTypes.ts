/**
 * @file Type definitions for Google/Gemini Provider
 */

import { Content, GenerateContentResponse } from '@google/genai';
import type { Tool } from '../../core/types/provider.types';

// Google API specific interfaces for strong typing
export interface GenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

// For proper typing of the Google GenAI API
export interface GetModelParameters {
  model: string;
  generationConfig?: Record<string, unknown>;
}

export interface GoogleGenAIModelInstance {
  generateContent(config: GoogleGenerateContentConfig): Promise<GenerateContentResponse & { response?: GenerateContentResponse }>;
}

export interface GoogleGenerateContentConfig {
  contents: Content[];
  generationConfig?: GenerationConfig;
  tools?: GoogleToolConfig[];
  toolConfig?: GoogleToolCallingConfig;
}

export interface GoogleToolConfig {
  functionDeclarations: GoogleFunctionDeclaration[];
}

export interface GoogleFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GoogleToolCallingConfig {
  functionCallingConfig: {
    mode?: 'AUTO' | 'ANY' | 'NONE';
    allowedFunctionNames?: string[];
  };
}

export interface GoogleResponseCandidate {
  content?: {
    parts?: GoogleResponsePart[];
  };
}

export interface GoogleResponsePart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

export interface GoogleFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GoogleGenAIResponse {
  candidates?: GoogleResponseCandidate[];
  text?: string;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  functionCalls?: GoogleFunctionCall[];
  response?: GoogleGenAIResponse;
}

/**
 * Converts the generic Tool interface to Google's function declaration format
 * @param tools Array of Tool objects to convert
 * @returns Google-specific function declaration format or undefined if no tools provided
 */
export function convertToolsToGoogleFormat(tools?: Tool[]): GoogleToolConfig[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }
  
  // Create a functionDeclarations array in the format Google Gemini expects
  const functionDeclarations = tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: {
      type: tool.parameters.type,
      properties: tool.parameters.properties,
      required: tool.parameters.required || []
    }
  }));
  
  // Return the tools array in Google's format
  return [{
    functionDeclarations
  }];
}

/**
 * Converts the toolChoice parameter to Google's function calling config format
 * @param toolChoice The toolChoice parameter from the request
 * @returns Google-specific function calling config format
 */
export function convertToolChoiceToGoogleFormat(
  toolChoice: 'auto' | 'required' | 'none' | { type: 'function'; name: string }
): GoogleToolCallingConfig {
  const toolConfig: GoogleToolCallingConfig = {
    functionCallingConfig: {}
  };
  
  if (typeof toolChoice === 'string') {
    switch (toolChoice) {
      case 'auto': {
        // This is the default, so no need to specify
        toolConfig.functionCallingConfig.mode = 'AUTO';
        break;
      }
      case 'required': {
        toolConfig.functionCallingConfig.mode = 'ANY';
        break;
      }
      case 'none': {
        toolConfig.functionCallingConfig.mode = 'NONE';
        break;
      }
    }
  } else if (toolChoice && typeof toolChoice === 'object' && toolChoice.type === 'function') {
    // Specific tool requested
    toolConfig.functionCallingConfig.mode = 'ANY';
    toolConfig.functionCallingConfig.allowedFunctionNames = [toolChoice.name];
  }
  
  return toolConfig;
}