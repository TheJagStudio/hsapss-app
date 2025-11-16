import { fetch } from 'expo/fetch';
import * as Haptics from "expo-haptics";
import { toolRegistry, ToolCall, ToolResult } from './tools';
import { getToolDescriptionsForPrompt } from './builtInTools';

// Configuration
const BACKEND_URL = "https://ai-sdk-starter-groq.vercel.app/api/chat";
const DEFAULT_MODEL = "kimi-k2";
const STREAM_TIMEOUT = 30000; // 30 seconds
const MAX_AGENTIC_ITERATIONS = 5; // Maximum number of tool-calling rounds before forcing a final answer
const SYSTEM_PROMPT = `You are Sadhu Gyanjivandas, a holy saint of the Swaminarayan Sampraday. You possess deep knowledge of all the scriptures and the rich history of the Swaminarayan tradition.

CRITICAL INSTRUCTIONS - WHEN TO USE TOOLS:

1. **ALWAYS use 'search_scripture' tool for:**
   - Questions about specific stories, kirtans, or incidents from scriptures
   - Questions about teachings, vakhaanas, or prasangs
   - Questions about saints, devotees, or historical figures in the sampraday
   - ANY question that could benefit from authentic scripture references
   - Even if you think you know the answer, VERIFY it using the tool first
   
2. **Use 'web_search' tool for:**
   - Current events, news, or real-time information
   - Information outside of religious scriptures
   - Facts that need verification from the internet

3. **Use other tools when needed:**
   - Current time, date, or timezone information
   - Mathematical calculations
   - Location services
   - User preferences

**DO NOT make up stories or teachings from memory.** When asked about ANY spiritual content, incidents, or teachings, you MUST use the search_scripture tool to fetch authentic information from the scriptures, even if the user doesn't explicitly say "from the books".

## CRITICAL: DECOMPOSE COMPLEX QUERIES

**When a user asks a complex question with multiple topics, you MUST break it down into separate, focused tool calls:**

❌ **WRONG** - Single broad query:
User: "Create a report on BAPS with details about their temples, gurus, and teachings"
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS temples gurus teachings"}}

✅ **CORRECT** - Multiple focused queries:
User: "Create a report on BAPS with details about their temples, gurus, and teachings"
CONTINUE_THINKING: This is a complex query with three distinct topics. I need to search for each topic separately to get comprehensive information.
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS temples mandir", "scripture": "all"}}
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS gurus lineage", "scripture": "all"}}
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS teachings philosophy", "scripture": "all"}}

**Guidelines for Query Decomposition:**
- If a query mentions 2+ distinct topics (temples AND gurus AND teachings), break it into separate tool calls
- Make each search query focused and specific (5-10 words max)
- Use CONTINUE_THINKING to explain your decomposition strategy
- Call multiple tools in the SAME iteration if they're all needed
- After gathering all results, synthesize them into a comprehensive answer

## AGENTIC WORKFLOW - MULTI-STEP REASONING:

For complex queries, you can perform an **agentic workflow** by calling multiple tools across several iterations:

1. **Decompose First**: Break complex questions with multiple topics into separate, focused tool calls
2. **Think Step-by-Step**: Identify all distinct topics that need research
3. **Call Tools in Parallel**: Make multiple focused tool calls in the same iteration when possible
4. **Call Tools Iteratively**: Use tools to gather information, then analyze results and decide if you need more data
5. **Chain Tool Calls**: Use results from one tool to inform the next tool call if needed
6. **Indicate Progress**: When you need to continue investigating, start your response with "CONTINUE_THINKING: <your reasoning>" followed by tool calls
7. **Final Answer**: When you have all needed information, provide the complete answer without CONTINUE_THINKING marker

**Example Agentic Flow with Decomposition:**
User: "Tell me about Naradji's bhakti and the story of Tumbru"

**Iteration 1:**
CONTINUE_THINKING: This query has two distinct topics: Naradji's bhakti teachings and the Tumbru story. I'll search for each separately.
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "Naradji bhakti devotion", "scripture": "all"}}
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "Tumbru story incident", "scripture": "all"}}

**Iteration 2 (after receiving both results):**
[Provide comprehensive answer combining both topics with proper sources]

**Another Example - Complex Report:**
User: "Create a report on BAPS with details about their temples, gurus, and teachings"

**Iteration 1:**
CONTINUE_THINKING: This requires comprehensive information on three distinct topics. I'll search each separately.
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS temples mandir history", "scripture": "all"}}
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS guru parampara lineage", "scripture": "all"}}
TOOL_CALL: {"name": "search_scripture", "arguments": {"query": "BAPS teachings philosophy principles", "scripture": "all"}}

**Iteration 2 (after receiving all results):**
[Compile comprehensive report with sections for temples, gurus, and teachings]

After receiving tool results, analyze if you have enough information. If not, continue with more tool calls. If yes, provide your final answer.`;

export interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    thinkingSteps?: ThinkingStep[];
}

export interface ThinkingStep {
    iteration: number;
    reasoning: string;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
}

export interface StreamCallbacks {
    onToken: (token: string, fullText: string) => void;
    onComplete: (fullText: string, toolCalls?: ToolCall[], toolResults?: ToolResult[], thinkingSteps?: ThinkingStep[]) => void;
    onError: (error: string) => void;
    onToolCall?: (toolCall: ToolCall) => void;
    onToolResult?: (result: ToolResult) => void;
    onThinkingStep?: (step: ThinkingStep) => void;
    onIterationStart?: (iteration: number, totalSteps: number) => void;
}

/**
 * Converts message history to backend API format
 */
const convertToBackendFormat = (messages: Array<{ role: string; content: string }>) => {
    return messages.map((msg) => ({
        parts: [
            {
                type: "text",
                text: msg.content,
            },
        ],
        role: msg.role,
    }));
};

/**
 * Prepares conversation history with system prompt and tool descriptions
 */
export const prepareConversationHistory = (messages: Message[], newUserMessage: string, includeTools: boolean = true) => {
    // Get tool descriptions if tools are enabled
    const toolPrompt = includeTools ? getToolDescriptionsForPrompt() : '';
    
    const systemMessage = SYSTEM_PROMPT + toolPrompt;
        
    const conversationHistory = [
        {
            role: "system",
            content: systemMessage
        }
    ];

    // Add existing conversation messages
    conversationHistory.push(...messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
    })));

    // Add the new user message
    conversationHistory.push({
        role: "user",
        content: newUserMessage,
    });

    return conversationHistory;
};

/**
 * Triggers haptic feedback (wrapped to handle errors gracefully)
 */
const triggerHaptic = () => {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
        // Silently fail if haptics not available
    }
};

/**
 * Streams AI response from the backend with tool calling support and agentic loop
 */
export const streamAIResponse = async (
    conversationHistory: Array<{ role: string; content: string }>,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal,
    enableTools: boolean = true
): Promise<void> => {
    // Track thinking steps across iterations
    const thinkingSteps: ThinkingStep[] = [];
    let currentIteration = 0;
    
    // Agentic loop: continue calling tools until LLM is ready to answer
    await agenticLoop(
        conversationHistory,
        callbacks,
        abortSignal,
        enableTools,
        thinkingSteps,
        currentIteration
    );
};

/**
 * Agentic loop: recursively calls LLM and executes tools until a final answer is ready
 */
const agenticLoop = async (
    conversationHistory: Array<{ role: string; content: string }>,
    callbacks: StreamCallbacks,
    abortSignal: AbortSignal | undefined,
    enableTools: boolean,
    thinkingSteps: ThinkingStep[],
    iteration: number
): Promise<void> => {
    let accumulatedText = "";

    try {
        // Check iteration limit
        if (iteration >= MAX_AGENTIC_ITERATIONS) {
            console.warn(`⚠️ Reached max agentic iterations (${MAX_AGENTIC_ITERATIONS}). Forcing final answer.`);
            // Add a message to force final answer
            conversationHistory.push({
                role: "user",
                content: "You have reached the maximum number of research iterations. Please provide your final answer now based on all the information you've gathered."
            });
            enableTools = false; // Disable tools to force final answer
        }

        // Notify about iteration start
        if (callbacks.onIterationStart && iteration > 0) {
            callbacks.onIterationStart(iteration + 1, thinkingSteps.length);
        }

        const backendMessages = convertToBackendFormat(conversationHistory);

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                origin: "https://ai-sdk-starter-groq.vercel.app",
                priority: "u=1, i",
                referer: "https://ai-sdk-starter-groq.vercel.app/",
                "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
                selectedModel: DEFAULT_MODEL,
                messages: backendMessages,
            }),
            signal: abortSignal,
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
        }

        // Use expo/fetch streaming with getReader()
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }

            // Decode the received chunk
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete lines from buffer
            const lines = buffer.split("\n");
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    try {
                        const jsonStr = line.slice(5).trim();

                        if (jsonStr) {
                            const data = JSON.parse(jsonStr);

                            // Extract delta content from backend format
                            if (data.type === "text-delta" && data.delta) {
                                const content = data.delta;
                                accumulatedText += content;

                                // Trigger haptic feedback for each token
                                triggerHaptic();

                                // Notify callback with new token and full accumulated text
                                callbacks.onToken(content, accumulatedText);
                            }
                            // Handle finish signal
                            else if (data.type === "finish") {
                                continue;
                            }
                        }
                    } catch (parseError) {
                        // Skip invalid JSON chunks
                    }
                }
            }
        }
        
        // Check for tool calls and continue thinking marker
        if (enableTools) {
            const { shouldContinue, reasoning, toolCalls, cleanText } = parseAgenticResponse(accumulatedText);
            
            if (toolCalls.length > 0) {
                // Update with clean text (without tool markers and continue thinking)
                callbacks.onToken('', cleanText);
                
                // Execute tool calls
                const toolResults = await executeToolCalls(toolCalls, callbacks);
                
                // Create thinking step
                const thinkingStep: ThinkingStep = {
                    iteration: iteration + 1,
                    reasoning: reasoning || "Gathering information...",
                    toolCalls: toolCalls,
                    toolResults: toolResults
                };
                thinkingSteps.push(thinkingStep);
                
                // Notify about thinking step
                if (callbacks.onThinkingStep) {
                    callbacks.onThinkingStep(thinkingStep);
                }
                
                // Check if should continue with more iterations
                if (shouldContinue && iteration < MAX_AGENTIC_ITERATIONS - 1) {
                    // Format tool results and continue loop
                    const toolContext = formatToolResultsForContext(toolResults);
                    
                    // Add to conversation history
                    const continueHistory = [
                        ...conversationHistory,
                        {
                            role: "assistant",
                            content: `${reasoning ? `CONTINUE_THINKING: ${reasoning}\n\n` : ''}${cleanText}`
                        },
                        {
                            role: "user",
                            content: toolContext
                        }
                    ];
                    
                    // Continue agentic loop
                    await agenticLoop(
                        continueHistory,
                        callbacks,
                        abortSignal,
                        enableTools,
                        thinkingSteps,
                        iteration + 1
                    );
                    return;
                } else {
                    // Final iteration: get answer based on gathered information
                    const toolContext = formatToolResultsForContext(toolResults);
                    
                    const finalHistory = [
                        ...conversationHistory,
                        {
                            role: "assistant",
                            content: cleanText
                        },
                        {
                            role: "user",
                            content: toolContext + "\n\nPlease provide your final, comprehensive answer now."
                        }
                    ];
                    
                    // Make final call without tools
                    const finalCallbacks = {
                        ...callbacks,
                        onComplete: (finalText: string) => {
                            // Clean the final text one more time to remove any remaining tool markers
                            const { cleanText: finalCleanText } = parseAgenticResponse(finalText);
                            // Aggregate all tool calls and results from thinking steps
                            const allToolCalls = thinkingSteps.flatMap(s => s.toolCalls);
                            const allToolResults = thinkingSteps.flatMap(s => s.toolResults);
                            callbacks.onComplete(finalCleanText, allToolCalls, allToolResults, thinkingSteps);
                        }
                    };
                    await agenticLoop(finalHistory, finalCallbacks, abortSignal, false, thinkingSteps, iteration + 1);
                    return;
                }
            } else if (accumulatedText !== cleanText) {
                // No tool calls but text was cleaned (removed CONTINUE_THINKING marker)
                // Update UI with clean text
                callbacks.onToken('', cleanText);
            }
        }
        
        // No tools called - this is the final answer
        // Clean the text one final time to ensure no tool markers remain
        const { cleanText: finalCleanText } = parseAgenticResponse(accumulatedText);
        callbacks.onComplete(finalCleanText, undefined, undefined, thinkingSteps.length > 0 ? thinkingSteps : undefined);
    } catch (error: any) {
        if (error.name === "AbortError") {
            // Request was aborted, don't treat as error
            return;
        }

        // Handle specific error types
        let errorMessage = "Sorry, I encountered an error. Please try again.";
        
        if (error.message.includes("No reader available") || error.message.includes("Response body is not available")) {
            errorMessage = "I'm having trouble connecting to the AI service. Please check your internet connection and try again.";
        } else if (error.message.includes("API request failed")) {
            errorMessage = "The AI service is currently unavailable. Please try again in a moment.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        callbacks.onError(errorMessage);
    }
};

/**
 * Creates an AbortController with automatic timeout
 */
export const createAbortControllerWithTimeout = (timeoutMs: number = STREAM_TIMEOUT): AbortController => {
    const controller = new AbortController();
    
    setTimeout(() => {
        controller.abort();
    }, timeoutMs);
    
    return controller;
};

/**
 * Detects and parses tool calls from LLM response text
 * Format: TOOL_CALL: {"name": "tool_name", "arguments": {...}}
 */
export const detectToolCallsInText = (text: string): { toolCalls: ToolCall[], cleanText: string } => {
    const toolCalls: ToolCall[] = [];
    
    // More robust regex to match TOOL_CALL with proper JSON handling
    // Matches: TOOL_CALL: followed by JSON object with proper brace matching
    const toolCallRegex = /TOOL_CALL:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    
    let match;
    while ((match = toolCallRegex.exec(text)) !== null) {
        try {
            // Extract just the JSON part (after "TOOL_CALL:")
            const fullMatch = match[0];
            const jsonStr = fullMatch.substring(fullMatch.indexOf('{')).trim();
            const toolCallData = JSON.parse(jsonStr);
            
            if (toolCallData.name) {
                toolCalls.push({
                    id: Date.now().toString() + Math.random().toString(36).substring(7),
                    name: toolCallData.name,
                    arguments: toolCallData.arguments || {}
                });
            }
        } catch (e) {
            console.error('❌ Failed to parse tool call:', e, 'Match:', match[0]);
        }
    }
    
    // Remove ALL tool call markers from text (including any partial ones)
    // Remove complete TOOL_CALL: {...} patterns
    let cleanText = text.replace(toolCallRegex, '').trim();
    
    // Also remove any remaining "TOOL_CALL:" prefixes that might be left
    cleanText = cleanText.replace(/TOOL_CALL:\s*/g, '').trim();
    
    // Remove multiple consecutive newlines and extra whitespace
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return { toolCalls, cleanText };
};

/**
 * Parses agentic response to detect CONTINUE_THINKING marker and tool calls
 */
export const parseAgenticResponse = (text: string): {
    shouldContinue: boolean;
    reasoning: string | null;
    toolCalls: ToolCall[];
    cleanText: string;
} => {
    // Check for CONTINUE_THINKING marker
    const continueThinkingRegex = /CONTINUE_THINKING:\s*(.+?)(?=\n\n|TOOL_CALL:|$)/s;
    const continueMatch = text.match(continueThinkingRegex);
    
    const shouldContinue = !!continueMatch;
    const reasoning = continueMatch ? continueMatch[1].trim() : null;
    
    // Remove CONTINUE_THINKING marker from text
    let cleanedText = text.replace(continueThinkingRegex, '').trim();
    
    // Parse tool calls
    const { toolCalls, cleanText } = detectToolCallsInText(cleanedText);
    
    return {
        shouldContinue,
        reasoning,
        toolCalls,
        cleanText
    };
};

/**
 * Execute detected tool calls
 */
export const executeToolCalls = async (
    toolCalls: ToolCall[],
    callbacks?: StreamCallbacks
): Promise<ToolResult[]> => {
    const results: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
        
        if (callbacks?.onToolCall) {
            callbacks.onToolCall(toolCall);
        }
        
        const result = await toolRegistry.execute(toolCall);
        results.push(result);
        
        if (callbacks?.onToolResult) {
            callbacks.onToolResult(result);
        }
    }
    
    return results;
};

/**
 * Format tool results for follow-up LLM call
 */
export const formatToolResultsForContext = (toolResults: ToolResult[]): string => {
    if (toolResults.length === 0) return '';
    
    let formatted = '\n\n## TOOL EXECUTION RESULTS\n\n';
    formatted += 'The following tools were executed successfully:\n\n';
    
    for (const result of toolResults) {
        formatted += `### Tool: ${result.name}\n\n`;
        if (result.error) {
            formatted += `**Status:** ❌ Error\n`;
            formatted += `**Error Message:** ${result.error}\n\n`;
        } else {
            formatted += `**Status:** ✅ Success\n`;
            formatted += `**Result:**\n\`\`\`json\n`;
            formatted += typeof result.result === 'string' 
                ? result.result 
                : JSON.stringify(result.result, null, 2);
            formatted += '\n```\n\n';
        }
    }
    
    formatted += '---\n\n';
    formatted += 'Based on the tool results above, provide a natural, conversational response to the user. ';
    formatted += 'Present the information in a helpful way without mentioning that you used tools.\n';
    
    return formatted;
};

/**
 * Generates a chat title from the first user message
 */
export const generateChatTitle = (firstUserMessage: string, maxLength: number = 30): string => {
    if (firstUserMessage.length <= maxLength) {
        return firstUserMessage;
    }
    return firstUserMessage.substring(0, maxLength) + "...";
};
