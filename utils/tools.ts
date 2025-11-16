/**
 * Tool/Function Calling System for NarayanGPT
 * Implements a native tool calling interface that LLMs can use
 */

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    enum?: string[];
}

export interface Tool {
    name: string;
    description: string;
    parameters: ToolParameter[];
    execute: (args: Record<string, any>) => Promise<any>;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export interface ToolResult {
    id: string;
    name: string;
    result: any;
    error?: string;
}

/**
 * Registry of all available tools
 */
class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    register(tool: Tool): void {
        this.tools.set(tool.name, tool);
    }

    unregister(toolName: string): void {
        this.tools.delete(toolName);
    }

    get(toolName: string): Tool | undefined {
        return this.tools.get(toolName);
    }

    getAll(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Returns tool definitions in format suitable for LLM
     */
    getToolDefinitionsForLLM(): any[] {
        return this.getAll().map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters.reduce((acc, param) => {
                        acc[param.name] = {
                            type: param.type,
                            description: param.description,
                            ...(param.enum ? { enum: param.enum } : {})
                        };
                        return acc;
                    }, {} as Record<string, any>),
                    required: tool.parameters
                        .filter(p => p.required)
                        .map(p => p.name)
                }
            }
        }));
    }

    /**
     * Returns tool definitions in MCP format
     */
    getMCPToolDefinitions(): any[] {
        return this.getAll().map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: {
                type: 'object',
                properties: tool.parameters.reduce((acc, param) => {
                    acc[param.name] = {
                        type: param.type,
                        description: param.description,
                        ...(param.enum ? { enum: param.enum } : {})
                    };
                    return acc;
                }, {} as Record<string, any>),
                required: tool.parameters
                    .filter(p => p.required)
                    .map(p => p.name)
            }
        }));
    }

    /**
     * Execute a tool call
     */
    async execute(toolCall: ToolCall): Promise<ToolResult> {
        const tool = this.get(toolCall.name);
        
        if (!tool) {
            return {
                id: toolCall.id,
                name: toolCall.name,
                result: null,
                error: `Tool '${toolCall.name}' not found`
            };
        }

        try {
            // Validate required parameters
            const missingParams = tool.parameters
                .filter(p => p.required && !(p.name in toolCall.arguments))
                .map(p => p.name);

            if (missingParams.length > 0) {
                throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
            }

            const result = await tool.execute(toolCall.arguments);
            
            return {
                id: toolCall.id,
                name: toolCall.name,
                result
            };
        } catch (error: any) {
            return {
                id: toolCall.id,
                name: toolCall.name,
                result: null,
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    /**
     * Execute multiple tool calls in parallel
     */
    async executeMultiple(toolCalls: ToolCall[]): Promise<ToolResult[]> {
        return Promise.all(toolCalls.map(call => this.execute(call)));
    }
}

// Global tool registry instance
export const toolRegistry = new ToolRegistry();

/**
 * Helper function to create a tool
 */
export const createTool = (
    name: string,
    description: string,
    parameters: ToolParameter[],
    execute: (args: Record<string, any>) => Promise<any>
): Tool => {
    return {
        name,
        description,
        parameters,
        execute
    };
};

/**
 * Parse tool calls from LLM response
 * Supports multiple formats (OpenAI, Anthropic, etc.)
 */
export const parseToolCalls = (response: any): ToolCall[] => {
    const toolCalls: ToolCall[] = [];

    // OpenAI format
    if (response.tool_calls) {
        for (const call of response.tool_calls) {
            toolCalls.push({
                id: call.id || Date.now().toString(),
                name: call.function?.name || call.name,
                arguments: typeof call.function?.arguments === 'string' 
                    ? JSON.parse(call.function.arguments)
                    : call.function?.arguments || call.arguments || {}
            });
        }
    }
    
    // Anthropic format
    if (response.content) {
        for (const block of response.content) {
            if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id || Date.now().toString(),
                    name: block.name,
                    arguments: block.input || {}
                });
            }
        }
    }

    return toolCalls;
};

/**
 * Format tool results for LLM context
 */
export const formatToolResultsForLLM = (results: ToolResult[]): string => {
    return results.map(result => {
        if (result.error) {
            return `Tool '${result.name}' failed: ${result.error}`;
        }
        return `Tool '${result.name}' result: ${JSON.stringify(result.result, null, 2)}`;
    }).join('\n\n');
};
