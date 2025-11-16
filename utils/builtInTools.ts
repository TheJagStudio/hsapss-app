/**
 * Built-in Tools for NarayanGPT
 * Example implementations of tools that LLM can call
 */

import { createTool, toolRegistry } from './tools';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';


/**
 * Get current date and time
 */
const getCurrentTimeTool = createTool(
    'get_current_time',
    'Get the current date and time in ISO format',
    [
        {
            name: 'timezone',
            type: 'string',
            description: 'Optional timezone (e.g., "America/New_York", "Asia/Kolkata")',
            required: false
        }
    ],
    async (args) => {
        const now = new Date();
        
        if (args.timezone) {
            return {
                datetime: now.toLocaleString('en-US', { timeZone: args.timezone }),
                timestamp: now.toISOString(),
                timezone: args.timezone
            };
        }
        
        return {
            datetime: now.toLocaleString(),
            timestamp: now.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
);

/**
 * Calculate mathematical expressions
 */
const calculateTool = createTool(
    'calculate',
    'Perform mathematical calculations. Supports basic arithmetic operations (+, -, *, /, %, **)',
    [
        {
            name: 'expression',
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5 + 3")',
            required: true
        }
    ],
    async (args) => {
        try {
            // Security: Only allow numbers and safe operators
            const sanitized = args.expression.replace(/[^0-9+\-*/.() ]/g, '');
            
            if (sanitized !== args.expression) {
                throw new Error('Expression contains invalid characters');
            }
            
            // Use Function constructor for safe evaluation
            const result = new Function(`return ${sanitized}`)();
            
            return {
                expression: args.expression,
                result: result,
                formatted: `${args.expression} = ${result}`
            };
        } catch (error: any) {
            throw new Error(`Calculation failed: ${error.message}`);
        }
    }
);

/**
 * Get user's current location
 */
const getLocationTool = createTool(
    'get_location',
    'Get the user\'s current GPS location (requires permission)',
    [],
    async () => {
        try {
            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status !== 'granted') {
                throw new Error('Location permission not granted');
            }
            
            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });
            
            // Reverse geocode to get address
            const addresses = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            
            const address = addresses[0];
            
            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                altitude: location.coords.altitude,
                accuracy: location.coords.accuracy,
                address: address ? {
                    city: address.city,
                    region: address.region,
                    country: address.country,
                    postalCode: address.postalCode,
                    street: address.street
                } : null
            };
        } catch (error: any) {
            throw new Error(`Failed to get location: ${error.message}`);
        }
    }
);

/**
 * Search scripture database
 */
const searchScriptureTool = createTool(
    'search_scripture',
    'ALWAYS use this tool to search through Vachanamrut and Swamini Vato scriptures for ANY question about: stories, incidents, kirtans, teachings, prasangs, saints, devotees, or any spiritual content. Use this for questions like "tell me about X", "what is the story of Y", "explain Z teaching", etc. MANDATORY for any scripture-related questions.',
    [
        {
            name: 'query',
            type: 'string',
            description: 'Search query to find in scriptures (e.g., "naradji and tumbru story", "bhakti teachings", "murti installation")',
            required: true
        },
        {
            name: 'scripture',
            type: 'string',
            description: 'Which scripture to search (default: swamini_vato)',
            required: false,
            enum: ['vachanamrut', 'swamini_vato', 'all']
        },
        {
            name: 'max_results',
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            required: false
        }
    ],
    async (args) => {
        try {
            // Import API_BASE_URL dynamically to avoid circular dependencies
            const { API_BASE_URL } = require('./api');
            
            const response = await fetch(`${API_BASE_URL}/llm-api/search-books/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: args.query,
                    scripture: args.scripture || 'swamini_vato',
                    max_results: args.max_results || 5,
                    max_tokens: 2000
                })
            });
            
            if (!response.ok) {
                throw new Error(`Search failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Format the response for the LLM
            return {
                query: data.query,
                scripture: data.scripture,
                num_sources: data.num_sources,
                sources: data.sources.map((source: any) => ({
                    chapter: source.chapter,
                    vat: source.vat,
                    title: source.title,
                    audio_url: source.audio_url
                })),
                context: data.context,
                message: `Found ${data.num_sources} relevant passages from ${data.scripture}. Use the context to answer the user's question.`
            };
        } catch (error: any) {
            console.error('Scripture search error:', error);
            return {
                error: true,
                message: `Failed to search scriptures: ${error.message}`,
                query: args.query
            };
        }
    }
);

/**
 * Get upcoming events/festivals
 */
const getUpcomingEventsTool = createTool(
    'get_upcoming_events',
    'Get upcoming Hindu festivals and important dates',
    [
        {
            name: 'days',
            type: 'number',
            description: 'Number of days to look ahead (default: 30)',
            required: false
        }
    ],
    async (args) => {
        const days = args.days || 30;
        
        // In real implementation, fetch from your calendar data
        return {
            days: days,
            events: [
                {
                    name: 'Diwali',
                    date: '2025-11-01',
                    description: 'Festival of Lights',
                    type: 'major'
                },
                {
                    name: 'Dev Diwali',
                    date: '2025-11-15',
                    description: 'Festival of Gods',
                    type: 'important'
                }
            ],
            message: 'Mock event data. Integrate with your CalendarData.csv'
        };
    }
);

/**
 * Store user preferences
 */
const setPreferenceTool = createTool(
    'set_preference',
    'Store a user preference or reminder',
    [
        {
            name: 'key',
            type: 'string',
            description: 'Preference key/name',
            required: true
        },
        {
            name: 'value',
            type: 'string',
            description: 'Preference value',
            required: true
        }
    ],
    async (args) => {
        try {
            await AsyncStorage.setItem(
                `user_pref_${args.key}`,
                JSON.stringify({
                    value: args.value,
                    timestamp: new Date().toISOString()
                })
            );
            
            return {
                success: true,
                key: args.key,
                value: args.value,
                message: `Preference "${args.key}" saved successfully`
            };
        } catch (error: any) {
            throw new Error(`Failed to save preference: ${error.message}`);
        }
    }
);

/**
 * Get stored user preference
 */
const getPreferenceTool = createTool(
    'get_preference',
    'Retrieve a stored user preference',
    [
        {
            name: 'key',
            type: 'string',
            description: 'Preference key/name to retrieve',
            required: true
        }
    ],
    async (args) => {
        try {
            const stored = await AsyncStorage.getItem(`user_pref_${args.key}`);
            
            if (!stored) {
                return {
                    found: false,
                    key: args.key,
                    message: `No preference found for "${args.key}"`
                };
            }
            
            const data = JSON.parse(stored);
            
            return {
                found: true,
                key: args.key,
                value: data.value,
                timestamp: data.timestamp
            };
        } catch (error: any) {
            throw new Error(`Failed to retrieve preference: ${error.message}`);
        }
    }
);

/**
 * Get random scripture verse
 */
const getRandomVerseTool = createTool(
    'get_random_verse',
    'Get a random verse from scriptures for inspiration',
    [
        {
            name: 'scripture',
            type: 'string',
            description: 'Which scripture to get verse from',
            required: false,
            enum: ['vachanamrut', 'swamini_vato', 'bhagavad_gita']
        }
    ],
    async (args) => {
        try {
            // Import API_BASE_URL dynamically to avoid circular dependencies
            const { API_BASE_URL } = require('./api');
            
            const response = await fetch(`${API_BASE_URL}/llm-api/random-verse/`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch random verse: ${response.status}`);
            }
            
            const verse = await response.json();
            
            return {
                scripture: args.scripture || 'swamini_vato',
                verse: {
                    reference: verse.english_title,
                    chapter: verse.chapter_number,
                    vat: verse.vat_number,
                    text: verse.english_text,
                    footnote: verse.english_footnote || '',
                    audio_url: verse.audio_url || ''
                }
            };
        } catch (error: any) {
            console.error('Random verse error:', error);
            return {
                error: true,
                message: `Failed to get random verse: ${error.message}`
            };
        }
    }
);

/**
 * Search the web using SERP API
 */
const webSearchTool = createTool(
    'web_search',
    'Search the internet for current information, news, or answers using Google search',
    [
        {
            name: 'query',
            type: 'string',
            description: 'Search query to look up on the internet',
            required: true
        },
        {
            name: 'engine',
            type: 'string',
            description: 'Search engine to use',
            required: false,
            enum: ['google', 'bing', 'yahoo']
        },
        {
            name: 'language',
            type: 'string',
            description: 'Language for search results (default: en)',
            required: false
        }
    ],
    async (args) => {
        try {
            // Import API_BASE_URL dynamically to avoid circular dependencies
            const { API_BASE_URL } = require('./api');
            
            const response = await fetch(`${API_BASE_URL}/llm-api/serp-search/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: args.query,
                    engine: args.engine || 'google',
                    lang: args.language || 'en'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Web search failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract and format search results
            const results = data.results;
            const organicResults = results.organic || [];
            const knowledgeGraph = results.knowledge_graph;
            const answerBox = results.answer_box;
            
            // Format the response for the LLM
            const formattedResults = {
                query: data.query,
                engine: data.engine,
                total_results: organicResults.length,
                organic_count: organicResults.length, // For success message
                answer_box: answerBox ? {
                    title: answerBox.title,
                    answer: answerBox.answer || answerBox.snippet,
                    source: answerBox.link
                } : null,
                knowledge_graph: knowledgeGraph ? {
                    title: knowledgeGraph.title,
                    description: knowledgeGraph.description,
                    type: knowledgeGraph.type
                } : null,
                top_results: organicResults.slice(0, 5).map((result: any) => ({
                    title: result.title,
                    snippet: result.snippet,
                    url: result.link,
                    source: result.displayed_link || result.link
                }))
            };
            
            return {
                success: true,
                ...formattedResults,
                message: `Found ${formattedResults.total_results} search results for "${data.query}". Use this information to answer the user's question.`
            };
        } catch (error: any) {
            console.error('Web search error:', error);
            return {
                error: true,
                success: false,
                message: `Web search failed: ${error.message}`,
                query: args.query
            };
        }
    }
);

/**
 * Register all built-in tools
 */
export const registerBuiltInTools = () => {    
    toolRegistry.register(getCurrentTimeTool);
    toolRegistry.register(calculateTool);
    toolRegistry.register(getLocationTool);
    toolRegistry.register(searchScriptureTool);
    toolRegistry.register(getUpcomingEventsTool);
    toolRegistry.register(setPreferenceTool);
    toolRegistry.register(getPreferenceTool);
    toolRegistry.register(getRandomVerseTool);
    toolRegistry.register(webSearchTool);
    
    const registeredTools = toolRegistry.getAll();
};

/**
 * Get tool descriptions for system prompt
 */
export const getToolDescriptionsForPrompt = (): string => {
    const tools = toolRegistry.getAll();
    
    if (tools.length === 0) {
        console.warn('⚠️ No tools registered!');
        return '';
    }
    
    let description = '\n\n## AVAILABLE TOOLS\n\n';
    description += 'You have access to the following tools that you can use to help users:\n\n';
    
    tools.forEach(tool => {
        description += `### ${tool.name}\n`;
        description += `${tool.description}\n\n`;
        description += `**Parameters:**\n`;
        
        tool.parameters.forEach(param => {
            const required = param.required ? '**[REQUIRED]**' : '[optional]';
            const enumValues = param.enum ? ` (choices: ${param.enum.join(', ')})` : '';
            description += `- **${param.name}** ${required}: ${param.description}${enumValues}\n`;
        });
        
        description += '\n';
    });
    
    description += '## HOW TO USE TOOLS\n\n';
    description += 'When you need to use a tool, respond with EXACTLY this format:\n\n';
    description += 'TOOL_CALL: {"name": "tool_name", "arguments": {"param1": "value1", "param2": "value2"}}\n\n';
    description += '**CRITICAL RULES:**\n';
    description += '1. **ALWAYS use search_scripture for ANY spiritual questions** - stories, teachings, saints, incidents, prasangs, etc.\n';
    description += '2. **DECOMPOSE complex queries** - Break queries with multiple topics into separate focused tool calls\n';
    description += '3. Use tools PROACTIVELY - don\'t wait for explicit instructions like "search the books"\n';
    description += '4. Even if you think you know the answer, use search_scripture to verify and provide authentic sources\n';
    description += '5. Always use the exact tool name from the list above\n';
    description += '6. Keep each search query focused and specific (5-10 words max)\n';
    description += '7. Make multiple tool calls in the same iteration when topics are independent\n';
    description += '8. After calling tools, wait for results, then provide a natural answer based on those results\n\n';
    
    description += '**Examples:**\n\n';
    description += '**Simple Query:**\n';
    description += 'User: "What time is it?"\n';
    description += 'Assistant: TOOL_CALL: {"name": "get_current_time", "arguments": {}}\n\n';
    
    description += '**Single Topic Query:**\n';
    description += 'User: "Tell me about Naradji"\n';
    description += 'Assistant: TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "Naradji story", "scripture": "swamini_vato"}}\n\n';
    
    description += '**Complex Multi-Topic Query (DECOMPOSE IT!):**\n';
    description += 'User: "Create a report on BAPS with temples, gurus, and teachings"\n';
    description += 'Assistant: CONTINUE_THINKING: Complex query with 3 topics - I need separate searches.\n';
    description += 'TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS temples mandir", "scripture": "all"}}\n';
    description += 'TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS guru lineage", "scripture": "all"}}\n';
    description += 'TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS teachings philosophy", "scripture": "all"}}\n\n';
    
    description += '**Multiple Related Queries:**\n';
    description += 'User: "Tell me about bhakti and dharma"\n';
    description += 'Assistant: CONTINUE_THINKING: Two distinct concepts to search separately.\n';
    description += 'TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "bhakti devotion", "scripture": "all"}}\n';
    description += 'TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "dharma righteousness", "scripture": "all"}}\n\n';
    
    return description;
};
