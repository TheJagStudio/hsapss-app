/**
 * User-friendly messages for tool execution
 * Converts technical tool calls into readable messages for users
 */

import { ToolCall } from './tools';

/**
 * Generate a user-friendly message for a tool call
 */
export const getToolMessage = (toolCall: ToolCall): string => {
    const args = toolCall.arguments;

    switch (toolCall.name) {
        case 'search_scripture':
            const scripture = formatScripture(args.scripture);
            const maxResults = args.max_results || 5;
            let searchMsg = `📖 Searching ${scripture} for: "${args.query}"`;
            if (maxResults !== 5) {
                searchMsg += ` (requesting ${maxResults} results)`;
            }
            return searchMsg;

        case 'web_search':
            const engine = args.engine || 'Google';
            let webMsg = `🔍 Searching ${engine} for: "${args.query}"`;
            if (args.language && args.language !== 'en') {
                webMsg += ` (language: ${args.language})`;
            }
            return webMsg;

        case 'get_current_time':
            if (args.timezone) {
                return `🕐 Getting current time in timezone: ${args.timezone}`;
            }
            return `🕐 Getting current date and time`;

        case 'calculate':
            return `🧮 Calculating: ${args.expression}`;

        case 'get_location':
            return `📍 Getting your current GPS location (latitude, longitude, altitude)`;

        case 'get_upcoming_events':
            const days = args.days || 30;
            return `📅 Finding upcoming Hindu festivals and events in the next ${days} days`;

        case 'set_preference':
            return `💾 Saving preference: "${args.key}" = "${args.value}"`;

        case 'get_preference':
            return `🔍 Retrieving saved preference for: "${args.key}"`;

        case 'get_random_verse':
            const verseScripture = args.scripture ? formatScripture(args.scripture) : 'scriptures';
            return `✨ Finding a random inspiring verse from ${verseScripture}`;

        default:
            // Fallback for unknown tools - show arguments if available
            const argStr = formatArguments(args);
            if (argStr) {
                return `⚙️ ${formatToolName(toolCall.name)}: ${argStr}`;
            }
            return `⚙️ Using ${formatToolName(toolCall.name)}`;
    }
};

/**
 * Format scripture name for display
 */
const formatScripture = (scripture?: string): string => {
    if (!scripture || scripture === 'all') {
        return 'sacred scriptures';
    }

    const scriptureNames: Record<string, string> = {
        'vachanamrut': 'Vachanamrut',
        'swamini_vato': 'Swamini Vato',
        'bhagavad_gita': 'Bhagavad Gita'
    };

    return scriptureNames[scripture] || scripture;
};

/**
 * Format tool name for display (convert snake_case to Title Case)
 */
const formatToolName = (toolName: string): string => {
    return toolName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Format tool arguments for display
 */
const formatArguments = (args: Record<string, any>): string => {
    if (!args || Object.keys(args).length === 0) {
        return '';
    }

    const parts: string[] = [];
    for (const [key, value] of Object.entries(args)) {
        if (value !== null && value !== undefined && value !== '') {
            // Format the value based on its type
            let formattedValue: string;
            if (typeof value === 'string') {
                formattedValue = `"${value}"`;
            } else if (typeof value === 'object') {
                formattedValue = JSON.stringify(value);
            } else {
                formattedValue = String(value);
            }
            
            // Format key from snake_case to readable text
            const readableKey = key.split('_').join(' ');
            parts.push(`${readableKey}: ${formattedValue}`);
        }
    }

    return parts.join(', ');
};

/**
 * Generate a success message after tool execution
 */
export const getToolSuccessMessage = (toolCall: ToolCall, result: any): string | null => {
    // Return null for most tools (no need for success message)
    // Only return messages for specific tools where it makes sense
    
    switch (toolCall.name) {
        case 'search_scripture':
            if (result && result.num_sources !== undefined) {
                const count = result.num_sources;
                const scripture = result.scripture ? formatScripture(result.scripture) : 'scriptures';
                if (count === 0) {
                    return `📖 No results found in ${scripture}`;
                } else if (count === 1) {
                    return `✅ Found 1 relevant passage in ${scripture}`;
                } else {
                    return `✅ Found ${count} relevant passages in ${scripture}`;
                }
            }
            break;

        case 'web_search':
            if (result && result.organic_count !== undefined) {
                const count = result.organic_count;
                if (count === 0) {
                    return `🔍 No search results found`;
                } else if (count === 1) {
                    return `✅ Found 1 search result`;
                } else {
                    return `✅ Found ${count} search results`;
                }
            }
            break;

        case 'calculate':
            if (result && result.result !== undefined) {
                return `✅ Result: ${result.result}`;
            }
            break;

        case 'get_current_time':
            if (result && result.datetime) {
                return `✅ Current time: ${result.datetime}`;
            }
            break;

        case 'set_preference':
            return `✅ Preference saved successfully`;

        case 'get_preference':
            if (result && result.found) {
                return `✅ Retrieved: ${result.value}`;
            } else {
                return `⚠️ Preference not found`;
            }
            break;

        case 'get_location':
            if (result && result.address) {
                const addr = result.address;
                const location = [addr.city, addr.region, addr.country]
                    .filter(Boolean)
                    .join(', ');
                return location ? `📍 Location: ${location}` : `📍 Latitude: ${result.latitude}, Longitude: ${result.longitude}`;
            } else if (result && result.latitude) {
                return `📍 Lat: ${result.latitude.toFixed(4)}, Lon: ${result.longitude.toFixed(4)}`;
            }
            break;

        case 'get_upcoming_events':
            if (result && result.events) {
                const count = result.events.length;
                if (count === 0) {
                    return `📅 No upcoming events found`;
                } else if (count === 1) {
                    return `✅ Found 1 upcoming event`;
                } else {
                    return `✅ Found ${count} upcoming events`;
                }
            }
            break;

        case 'get_random_verse':
            if (result && result.verse) {
                const verse = result.verse;
                if (verse.reference) {
                    return `✅ Retrieved: ${verse.reference}`;
                }
                return `✅ Random verse retrieved`;
            }
            break;
    }

    return null;
};
