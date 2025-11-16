/**
 * Model Context Protocol (MCP) Client Implementation
 * Connect to and use publicly available MCP servers
 */

import { toolRegistry, createTool } from './tools';

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
    name: string;
    url: string;
    description: string;
    enabled: boolean;
    transport: 'http' | 'sse' | 'stdio';
    headers?: Record<string, string>;
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

/**
 * MCP Resource Definition
 */
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

/**
 * MCP Prompt Definition
 */
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}

/**
 * MCP Server Connection
 */
class MCPServerConnection {
    private config: MCPServerConfig;
    private initialized: boolean = false;
    private tools: MCPTool[] = [];
    private resources: MCPResource[] = [];
    private prompts: MCPPrompt[] = [];

    constructor(config: MCPServerConfig) {
        this.config = config;
    }

    /**
     * Initialize connection to MCP server
     */
    async initialize(): Promise<void> {
        try {
            const response = await fetch(`${this.config.url}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers
                },
                body: JSON.stringify({
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {},
                        resources: {},
                        prompts: {}
                    },
                    clientInfo: {
                        name: 'NarayanGPT',
                        version: '1.0.0'
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to initialize: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.initialized = true;
            
            // Load tools, resources, and prompts
            await this.loadCapabilities();
        } catch (error: any) {
            console.error(`❌ Failed to connect to ${this.config.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Load server capabilities (tools, resources, prompts)
     */
    private async loadCapabilities(): Promise<void> {
        // Load tools
        try {
            const toolsResponse = await this.sendRequest('tools/list');
            this.tools = toolsResponse.tools || [];
        } catch (error) {
            console.error(`  ⚠️ No tools available from ${this.config.name}`);
        }

        // Load resources
        try {
            const resourcesResponse = await this.sendRequest('resources/list');
            this.resources = resourcesResponse.resources || [];
        } catch (error) {
            console.error(`  ⚠️ No resources available from ${this.config.name}`);
        }

        // Load prompts
        try {
            const promptsResponse = await this.sendRequest('prompts/list');
            this.prompts = promptsResponse.prompts || [];
        } catch (error) {
            console.error(`  ⚠️ No prompts available from ${this.config.name}`);
        }
    }

    /**
     * Send request to MCP server
     */
    private async sendRequest(method: string, params?: any): Promise<any> {
        const response = await fetch(`${this.config.url}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.config.headers
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params
            })
        });

        if (!response.ok) {
            throw new Error(`MCP request failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'MCP request error');
        }

        return data.result;
    }

    /**
     * Call a tool on the MCP server
     */
    async callTool(name: string, args: Record<string, any>): Promise<any> {
        if (!this.initialized) {
            throw new Error('MCP server not initialized');
        }

        const result = await this.sendRequest('tools/call', {
            name,
            arguments: args
        });

        return result;
    }

    /**
     * Read a resource from the MCP server
     */
    async readResource(uri: string): Promise<any> {
        if (!this.initialized) {
            throw new Error('MCP server not initialized');
        }

        const result = await this.sendRequest('resources/read', {
            uri
        });

        return result;
    }

    /**
     * Get a prompt from the MCP server
     */
    async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
        if (!this.initialized) {
            throw new Error('MCP server not initialized');
        }

        const result = await this.sendRequest('prompts/get', {
            name,
            arguments: args
        });

        return result;
    }

    getTools(): MCPTool[] {
        return this.tools;
    }

    getResources(): MCPResource[] {
        return this.resources;
    }

    getPrompts(): MCPPrompt[] {
        return this.prompts;
    }

    getName(): string {
        return this.config.name;
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }
}

/**
 * MCP Client Manager
 */
class MCPClientManager {
    private servers: Map<string, MCPServerConnection> = new Map();
    private initialized: boolean = false;

    /**
     * Register an MCP server
     */
    registerServer(config: MCPServerConfig): void {
        const connection = new MCPServerConnection(config);
        this.servers.set(config.name, connection);
    }

    /**
     * Initialize all registered servers
     */
    async initializeAll(): Promise<void> {        
        const enabledServers = Array.from(this.servers.values()).filter(s => s.isEnabled());
        
        const results = await Promise.allSettled(
            enabledServers.map(server => server.initialize())
        );

        let successCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
            } else {
                console.error(`Failed to initialize server ${enabledServers[index].getName()}:`, result.reason);
            }
        });
        
        // Register all tools from MCP servers into the tool registry
        this.registerMCPTools();
        
        this.initialized = true;
    }

    /**
     * Register MCP server tools as local tools
     */
    private registerMCPTools(): void {
        for (const [serverName, connection] of this.servers.entries()) {
            const tools = connection.getTools();
            
            tools.forEach(mcpTool => {
                // Create a wrapper tool that calls the MCP server
                const wrappedTool = createTool(
                    `${serverName}_${mcpTool.name}`,
                    `[${serverName}] ${mcpTool.description}`,
                    this.convertMCPSchemaToToolParams(mcpTool.inputSchema),
                    async (args) => {
                        try {
                            const result = await connection.callTool(mcpTool.name, args);
                            return result.content?.[0]?.text || result;
                        } catch (error: any) {
                            throw new Error(`MCP tool error: ${error.message}`);
                        }
                    }
                );

                toolRegistry.register(wrappedTool);
            });
        }
    }

    /**
     * Convert MCP input schema to tool parameters
     */
    private convertMCPSchemaToToolParams(schema: any): any[] {
        const params: any[] = [];
        
        if (schema.properties) {
            for (const [name, prop] of Object.entries(schema.properties)) {
                params.push({
                    name,
                    type: (prop as any).type || 'string',
                    description: (prop as any).description || '',
                    required: schema.required?.includes(name) || false
                });
            }
        }
        
        return params;
    }

    /**
     * Get a server connection by name
     */
    getServer(name: string): MCPServerConnection | undefined {
        return this.servers.get(name);
    }

    /**
     * Get all registered servers
     */
    getAllServers(): MCPServerConnection[] {
        return Array.from(this.servers.values());
    }

    /**
     * Get all available tools across all servers
     */
    getAllTools(): Array<{ server: string; tool: MCPTool }> {
        const allTools: Array<{ server: string; tool: MCPTool }> = [];
        
        for (const [serverName, connection] of this.servers.entries()) {
            connection.getTools().forEach(tool => {
                allTools.push({ server: serverName, tool });
            });
        }
        
        return allTools;
    }

    /**
     * Get all available resources across all servers
     */
    getAllResources(): Array<{ server: string; resource: MCPResource }> {
        const allResources: Array<{ server: string; resource: MCPResource }> = [];
        
        for (const [serverName, connection] of this.servers.entries()) {
            connection.getResources().forEach(resource => {
                allResources.push({ server: serverName, resource });
            });
        }
        
        return allResources;
    }
}

// Global MCP client manager
export const mcpClient = new MCPClientManager();

/**
 * List of publicly available MCP servers
 * Add your favorite MCP servers here!
 */
const PUBLIC_MCP_SERVERS: MCPServerConfig[] = [
    // Example: Weather MCP Server
    // {
    //     name: 'weather',
    //     url: 'https://mcp-weather.example.com',
    //     description: 'Get weather information',
    //     enabled: false,
    //     transport: 'http'
    // },
    
    // Example: GitHub MCP Server
    // {
    //     name: 'github',
    //     url: 'https://mcp-github.example.com',
    //     description: 'Interact with GitHub repositories',
    //     enabled: false,
    //     transport: 'http',
    //     headers: {
    //         'Authorization': 'Bearer YOUR_GITHUB_TOKEN'
    //     }
    // },
    
    // Example: Database MCP Server
    // {
    //     name: 'database',
    //     url: 'https://mcp-db.example.com',
    //     description: 'Query database',
    //     enabled: false,
    //     transport: 'http'
    // },
];

/**
 * Initialize MCP client with public servers
 */
export const initializeMCP = async () => {
    // Register all public MCP servers
    PUBLIC_MCP_SERVERS.forEach(config => {
        mcpClient.registerServer(config);
    });

    // Initialize connections
    try {
        await mcpClient.initializeAll();
    } catch (error) {
        console.error('Some MCP servers failed to initialize:', error);
    }
};

/**
 * Add a custom MCP server at runtime
 */
export const addMCPServer = async (config: MCPServerConfig) => {
    mcpClient.registerServer(config);
    
    if (config.enabled) {
        const server = mcpClient.getServer(config.name);
        if (server) {
            await server.initialize();
        }
    }
};

/**
 * Get system prompt with MCP tools included
 */
export const getMCPSystemPrompt = (): string => {
    const allTools = mcpClient.getAllTools();
    const allResources = mcpClient.getAllResources();
    
    if (allTools.length === 0 && allResources.length === 0) {
        return '';
    }
    
    let prompt = '\n\nYou have access to the following external services via Model Context Protocol:\n\n';
    
    if (allTools.length > 0) {
        prompt += '**Available External Tools:**\n';
        allTools.forEach(({ server, tool }) => {
            prompt += `- ${server}_${tool.name}: ${tool.description}\n`;
        });
        prompt += '\n';
    }
    
    if (allResources.length > 0) {
        prompt += '**Available Resources:**\n';
        allResources.forEach(({ server, resource }) => {
            prompt += `- [${server}] ${resource.name}: ${resource.description || resource.uri}\n`;
        });
        prompt += '\n';
    }
    
    return prompt;
};
