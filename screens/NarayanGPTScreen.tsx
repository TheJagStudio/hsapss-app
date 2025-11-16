import { View, Text, ImageBackground, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Animated, Dimensions, Clipboard } from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrushCleaningIcon, ChevronLeft, LucideTrash, Send, Trash, Trash2, Menu, X, Edit2, Plus, MessageSquare, MoreVertical, Copy, Volume2, RotateCcw, ChevronDown, ChevronUp, Wrench, Brain } from "lucide-react-native";
import { ScrollView } from "react-native-gesture-handler";
import { ChatConversation } from "../utils/storage";
import { 
    Message, 
    ThinkingStep,
    prepareConversationHistory, 
    streamAIResponse, 
    createAbortControllerWithTimeout,
} from "../utils/llm";
import {
    DEFAULT_WELCOME_MESSAGE,
    loadChatConversations,
    saveCurrentChat,
    createNewChat,
    switchToChat,
    deleteChat,
    renameChat,
    clearCurrentChat,
} from "../utils/chat";
import { ToolCall, ToolResult } from "../utils/tools";
import { registerBuiltInTools } from "../utils/builtInTools";
import { initializeMCP } from "../utils/mcp";
import Markdown from "react-native-markdown-display";
import { getToolMessage, getToolSuccessMessage } from "../utils/toolMessages";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NarayanGPTScreen = ({ navigation }) => {
    const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
    const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [executingTools, setExecutingTools] = useState<string[]>([]);
    const [messageMenuVisible, setMessageMenuVisible] = useState<string | null>(null);
    const [messageMenuPosition, setMessageMenuPosition] = useState({ x: 0, y: 0 });
    const [expandedReasoningIds, setExpandedReasoningIds] = useState<Set<string>>(new Set());
    const [agenticProgress, setAgenticProgress] = useState<{ iteration: number; total: number } | null>(null);
    const [currentThinking, setCurrentThinking] = useState<string | null>(null);
    
    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Initialize tools and MCP on component mount
    useEffect(() => {
        registerBuiltInTools();
        initializeMCP();
        loadChatConversationsHandler();
    }, []);

    // Save current chat whenever messages change
    useEffect(() => {
        if (activeChatId) {
            saveCurrentChatHandler();
        }
    }, [messages]);

    const loadChatConversationsHandler = async () => {
        try {
            const result = await loadChatConversations(messages);
            setChatConversations(result.conversations);
            setActiveChatIdState(result.activeChatId);
            setMessages(result.messages);
        } catch (error) {
            console.error("Error loading chat conversations:", error);
        }
    };

    const saveCurrentChatHandler = async () => {
        try {
            const conversation = await saveCurrentChat(activeChatId, messages, chatConversations);
            if (conversation) {
                // Update local state
                setChatConversations(prev => {
                    const filtered = prev.filter(c => c.id !== activeChatId);
                    return [conversation, ...filtered];
                });
            }
        } catch (error) {
            console.error("Error saving current chat:", error);
        }
    };

    const clearChat = async () => {
        try {
            const result = await clearCurrentChat(activeChatId);
            setActiveChatIdState(result.chatId);
            setMessages(result.messages);
            setChatConversations(prev => [result.conversation, ...prev.filter(c => c.id !== activeChatId)]);
        } catch (error) {
            console.error("Error clearing chat:", error);
        }
    };

    const createNewChatHandler = async () => {
        try {
            const result = await createNewChat();
            setActiveChatIdState(result.chatId);
            setMessages(result.messages);
            setChatConversations(prev => [result.conversation, ...prev]);
            
            // Close panel
            closeSidePanel();
        } catch (error) {
            console.error("Error creating new chat:", error);
        }
    };

    const switchToChatHandler = async (chatId: string) => {
        try {
            const result = await switchToChat(chatId, activeChatId, messages, chatConversations);
            if (result) {
                setMessages(result.messages);
                setActiveChatIdState(result.chatId);
            }
            
            closeSidePanel();
        } catch (error) {
            console.error("Error switching chat:", error);
        }
    };

    const deleteChatHandler = async (chatId: string) => {
        try {
            const result = await deleteChat(chatId, activeChatId);
            setChatConversations(prev => prev.filter(c => c.id !== chatId));
            
            // If deleted chat was active, create a new one
            if (result.shouldCreateNew) {
                createNewChatHandler();
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    const startEditingChat = (chatId: string, currentTitle: string) => {
        setEditingChatId(chatId);
        setEditingTitle(currentTitle);
    };

    const saveEditedTitle = async (chatId: string) => {
        try {
            const success = await renameChat(chatId, editingTitle);
            if (success) {
                setChatConversations(prev => 
                    prev.map(c => c.id === chatId ? { ...c, title: editingTitle.trim() } : c)
                );
            }
            setEditingChatId(null);
            setEditingTitle("");
        } catch (error) {
            console.error("Error renaming chat:", error);
        }
    };

    const openSidePanel = () => {
        setIsPanelOpen(true);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeSidePanel = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_WIDTH,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsPanelOpen(false);
            setEditingChatId(null);
            setOpenMenuId(null);
        });
    };

    const toggleMenu = (chatId: string) => {
        setOpenMenuId(openMenuId === chatId ? null : chatId);
    };

    const toggleReasoning = (messageId: string) => {
        setExpandedReasoningIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };

    const handleCopyMessage = (text: string) => {
        Clipboard.setString(text);
        setMessageMenuVisible(null);
    };

    const handleSpeakMessage = (text: string) => {
        // Dummy function for now - will be implemented later
        setMessageMenuVisible(null);
        console.log('Speaking message:', text);
        // TODO: Implement text-to-speech functionality
    };

    const handleRetryMessage = async (messageId: string) => {
        setMessageMenuVisible(null);
        
        // Find the user message that we want to retry
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return;
        
        // Get all messages up to the AI response (excluding the AI response we want to retry)
        const messagesToKeep = messages.slice(0, messageIndex);
        const userMessage = messages[messageIndex - 1]; // Get the user message before the AI response
        
        if (!userMessage || userMessage.isUser === false) return;
        
        // Reset messages to before the AI response
        setMessages(messagesToKeep);
        setIsLoading(true);

        // Create new AI response placeholder
        const aiMessageId = Date.now().toString();
        const aiMessage: Message = {
            id: aiMessageId,
            text: "",
            isUser: false,
            timestamp: new Date(),
        };

        setMessages((prevMessages) => [...prevMessages, aiMessage]);

        // Prepare conversation history
        const conversationHistory = prepareConversationHistory(messagesToKeep.slice(0, -1), userMessage.text);

        // Create abort controller with timeout
        abortControllerRef.current = createAbortControllerWithTimeout();

        try {
            await streamAIResponse(
                conversationHistory,
                {
                    onToken: (token, fullText) => {
                        setMessages((prevMessages) => 
                            prevMessages.map((msg) => 
                                msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                            )
                        );
                    },
                    onComplete: (fullText, toolCalls, toolResults, thinkingSteps) => {
                        setMessages((prevMessages) => 
                            prevMessages.map((msg) => 
                                msg.id === aiMessageId ? { 
                                    ...msg, 
                                    text: fullText,
                                    toolCalls: toolCalls,
                                    toolResults: toolResults,
                                    thinkingSteps: thinkingSteps
                                } : msg
                            )
                        );
                        setExecutingTools([]);
                        setAgenticProgress(null);
                        setCurrentThinking(null);
                    },
                    onError: (errorMessage) => {
                        setMessages((prevMessages) =>
                            prevMessages.map((msg) =>
                                msg.id === aiMessageId
                                    ? { ...msg, text: errorMessage }
                                    : msg
                            )
                        );
                        setExecutingTools([]);
                        setAgenticProgress(null);
                        setCurrentThinking(null);
                    },
                    onToolCall: (toolCall: ToolCall) => {
                        setExecutingTools(prev => [...prev, toolCall.name]);
                    },
                    onToolResult: (result: ToolResult) => {
                        setExecutingTools(prev => prev.filter(t => t !== result.name));
                    },
                    onThinkingStep: (step) => {
                        setCurrentThinking(step.reasoning);
                    },
                    onIterationStart: (iteration, total) => {
                        setAgenticProgress({ iteration, total });
                    },
                },
                abortControllerRef.current.signal,
                true
            );
        } finally {
            setIsLoading(false);
            setExecutingTools([]);
            setAgenticProgress(null);
            setCurrentThinking(null);
            abortControllerRef.current = null;
        }
    };

    const sendMessage = async () => {
        if (inputText.trim() && !isLoading) {
            const userMessageText = inputText.trim();
            const newMessage: Message = {
                id: Date.now().toString(),
                text: userMessageText,
                isUser: true,
                timestamp: new Date(),
            };

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInputText("");
            setIsLoading(true);

            // Create AI response placeholder
            const aiMessageId = (Date.now() + 1).toString();
            const aiMessage: Message = {
                id: aiMessageId,
                text: "",
                isUser: false,
                timestamp: new Date(),
            };

            setMessages((prevMessages) => [...prevMessages, aiMessage]);

            // Prepare conversation history
            const conversationHistory = prepareConversationHistory(messages, userMessageText);

            // Create abort controller with timeout
            abortControllerRef.current = createAbortControllerWithTimeout();

            try {
                await streamAIResponse(
                    conversationHistory,
                    {
                        onToken: (token, fullText) => {
                            // Update the message in real-time
                            setMessages((prevMessages) => 
                                prevMessages.map((msg) => 
                                    msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                                )
                            );
                        },
                        onComplete: (fullText, toolCalls, toolResults, thinkingSteps) => {
                            // Ensure the final text is set with tool data
                            setMessages((prevMessages) => 
                                prevMessages.map((msg) => 
                                    msg.id === aiMessageId ? { 
                                        ...msg, 
                                        text: fullText,
                                        toolCalls: toolCalls,
                                        toolResults: toolResults,
                                        thinkingSteps: thinkingSteps
                                    } : msg
                                )
                            );
                            setExecutingTools([]);
                            setAgenticProgress(null);
                            setCurrentThinking(null);
                        },
                        onError: (errorMessage) => {
                            // Update AI message with error
                            setMessages((prevMessages) =>
                                prevMessages.map((msg) =>
                                    msg.id === aiMessageId
                                        ? { ...msg, text: errorMessage }
                                        : msg
                                )
                            );
                            setExecutingTools([]);
                            setAgenticProgress(null);
                            setCurrentThinking(null);
                        },
                        onToolCall: (toolCall: ToolCall) => {
                            // Add tool to executing list
                            setExecutingTools(prev => [...prev, toolCall.name]);
                        },
                        onToolResult: (result: ToolResult) => {
                            // Remove tool from executing list
                            setExecutingTools(prev => prev.filter(t => t !== result.name));
                        },
                        onThinkingStep: (step) => {
                            setCurrentThinking(step.reasoning);
                        },
                        onIterationStart: (iteration, total) => {
                            setAgenticProgress({ iteration, total });
                        },
                    },
                    abortControllerRef.current.signal,
                    true // Enable tools
                );
            } finally {
                setIsLoading(false);
                setExecutingTools([]);
                setAgenticProgress(null);
                setCurrentThinking(null);
                abortControllerRef.current = null;
            }
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isTyping = !item.isUser && item.text === "" && isLoading;
        const hasToolInteractions = item.toolCalls && item.toolCalls.length > 0;
        const hasThinkingSteps = item.thinkingSteps && item.thinkingSteps.length > 0;
        const isReasoningExpanded = expandedReasoningIds.has(item.id);

        return (
            <View className={` mb-3 ${item.isUser ? "self-end max-w-[80%]" : "self-start w-full"}`}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onLongPress={(e) => {
                        if (!isTyping && item.text) {
                            const { pageX, pageY } = e.nativeEvent;
                            setMessageMenuPosition({ x: pageX, y: pageY });
                            setMessageMenuVisible(item.id);
                        }
                    }}
                    delayLongPress={500}
                >
                    <View className={item.isUser ? "px-4 py-3 rounded-2xl  bg-primary-600 rounded-br-none border border-primary-950" : "bg-white rounded-2xl border border-gray-300"}>
                        {/* Thinking Steps - Show if agentic workflow was used */}
                        {hasThinkingSteps && !item.isUser && (
                            <View className="border-b border-gray-200">
                                <TouchableOpacity
                                    onPress={() => toggleReasoning(item.id)}
                                    className="flex-row items-center justify-between px-4 py-2 bg-purple-50 rounded-t-2xl"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <Brain size={16} color="#9333ea" />
                                        <Text className="text-purple-700 font-medium ml-2 text-sm">
                                            Research Process ({item.thinkingSteps?.length} step{item.thinkingSteps?.length !== 1 ? 's' : ''})
                                        </Text>
                                    </View>
                                    {isReasoningExpanded ? (
                                        <ChevronUp size={18} color="#9333ea" />
                                    ) : (
                                        <ChevronDown size={18} color="#9333ea" />
                                    )}
                                </TouchableOpacity>

                                {/* Expanded Thinking Steps */}
                                {isReasoningExpanded && (
                                    <View className="px-4 pt-3 pb-2 bg-purple-50">
                                        {item.thinkingSteps?.map((step, stepIndex) => (
                                            <View key={stepIndex} className="mb-3">
                                                <View className="bg-white rounded-lg p-3 border border-purple-200">
                                                    <Text className="text-purple-800 font-semibold text-sm mb-2">
                                                        Step {step.iteration}: {step.reasoning}
                                                    </Text>
                                                    
                                                    {/* Tools used in this step */}
                                                    {step.toolCalls.map((toolCall, toolIndex) => {
                                                        const toolResult = step.toolResults.find(r => r.id === toolCall.id);
                                                        const userFriendlyMessage = getToolMessage(toolCall);
                                                        const successMessage = toolResult && !toolResult.error 
                                                            ? getToolSuccessMessage(toolCall, toolResult.result)
                                                            : null;
                                                        
                                                        return (
                                                            <View key={toolCall.id} className="ml-3 mt-2 bg-gray-50 rounded p-2">
                                                                <Text className="text-gray-700 text-xs">
                                                                    {userFriendlyMessage}
                                                                </Text>
                                                                {toolResult && (
                                                                    <Text className="text-gray-600 text-xs mt-1">
                                                                        {toolResult.error 
                                                                            ? `❌ ${toolResult.error}` 
                                                                            : successMessage || '✅ Completed'
                                                                        }
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Reasoning Dropdown - Show if tools were used (for non-agentic single tool calls) */}
                        {hasToolInteractions && !hasThinkingSteps && !item.isUser && (
                            <View className="border-b border-gray-200">
                                <TouchableOpacity
                                    onPress={() => toggleReasoning(item.id)}
                                    className="flex-row items-center justify-between px-4 py-2 bg-blue-50 rounded-t-2xl"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <Wrench size={16} color="#2563eb" />
                                        <Text className="text-blue-700 font-medium ml-2 text-sm">
                                            Reasoning ({item.toolCalls?.length} tool{item.toolCalls?.length !== 1 ? 's' : ''})
                                        </Text>
                                    </View>
                                    {isReasoningExpanded ? (
                                        <ChevronUp size={18} color="#2563eb" />
                                    ) : (
                                        <ChevronDown size={18} color="#2563eb" />
                                    )}
                                </TouchableOpacity>

                                {/* Expanded Tool Details */}
                                {isReasoningExpanded && (
                                    <View className="px-4 pt-3 bg-gray-50">
                                        {item.toolCalls?.map((toolCall, index) => {
                                            const toolResult = item.toolResults?.find(r => r.id === toolCall.id);
                                            const userFriendlyMessage = getToolMessage(toolCall);
                                            const successMessage = toolResult && !toolResult.error 
                                                ? getToolSuccessMessage(toolCall, toolResult.result)
                                                : null;
                                            
                                            return (
                                                <View key={toolCall.id} className="mb-3">
                                                    {/* User-Friendly Tool Message */}
                                                    <View className="bg-white rounded-lg p-3 border border-blue-200">
                                                        <Text className="text-gray-800 text-sm leading-5">
                                                            {userFriendlyMessage}
                                                        </Text>
                                                        
                                                        {/* Success Message or Error */}
                                                        {toolResult && (
                                                            <View className="mt-2">
                                                                {toolResult.error ? (
                                                                    <Text className="text-red-600 text-xs">
                                                                        ❌ {toolResult.error}
                                                                    </Text>
                                                                ) : successMessage ? (
                                                                    <Text className="text-green-700 text-xs">
                                                                        {successMessage}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Main Message Content */}
                        <View className={item.isUser ? "px-2 py-0" : "px-4 py-3"}>
                            {isTyping ? (
                                <View className="flex-row items-center space-x-2">
                                    <ActivityIndicator size="small" color="#446785" />
                                    <Text className="text-gray-600 ml-2">Thinking...</Text>
                                </View>
                            ) : item.isUser ? (
                                <Text className={`text-base text-white`}>{item.text}</Text>
                            ) : (
                                <Markdown style={{ body: { color: "#1f2937", fontSize: 16 } }}>{item.text}</Markdown>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderAgenticProgressIndicator = () => {
        if (!agenticProgress && !currentThinking && executingTools.length === 0) return null;

        return (
            <View className="px-4 mb-3">
                <View className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    {agenticProgress && (
                        <View className="flex-row items-center mb-2">
                            <ActivityIndicator size="small" color="#9333ea" />
                            <Text className="text-purple-700 font-semibold ml-2">
                                Research Step {agenticProgress.iteration} {agenticProgress.total > 0 ? `of ${agenticProgress.total + 1}` : ''}
                            </Text>
                        </View>
                    )}
                    
                    {currentThinking && (
                        <View className="bg-purple-100 rounded-lg px-3 py-2 mb-2">
                            <Text className="text-purple-600 text-xs font-semibold mb-1">🤔 Thinking:</Text>
                            <Text className="text-purple-700 text-sm">{currentThinking}</Text>
                        </View>
                    )}
                    
                    {executingTools.length > 0 && (
                        <View className="mt-2">
                            <Text className="text-purple-600 text-xs font-semibold mb-1">⚙️ Active Tools:</Text>
                            {executingTools.map((tool, index) => (
                                <Text key={index} className="text-purple-600 text-sm ml-4">
                                    • {tool.replace(/_/g, ' ')}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderToolExecutionIndicator = () => {
        // This is now replaced by renderAgenticProgressIndicator
        // Kept for backwards compatibility, but return null
        return null;
    };

    const renderMessageMenu = () => {
        if (!messageMenuVisible) return null;

        const message = messages.find(msg => msg.id === messageMenuVisible);
        if (!message) return null;

        return (
            <Modal
                visible={!!messageMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMessageMenuVisible(null)}
            >
                <TouchableOpacity
                    className="flex-1"
                    activeOpacity={1}
                    onPress={() => setMessageMenuVisible(null)}
                >
                    <View className="flex-1 bg-black/40 justify-center items-center px-8">
                        <View className="bg-white rounded-2xl overflow-hidden w-full max-w-xs" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
                            {/* Copy Option */}
                            <TouchableOpacity
                                onPress={() => handleCopyMessage(message.text)}
                                className="flex-row items-center px-5 py-4 border-b border-gray-100"
                            >
                                <Copy size={20} color="#446785" />
                                <Text className="text-gray-800 font-medium ml-3 text-base">Copy</Text>
                            </TouchableOpacity>

                            {/* Speak Option */}
                            <TouchableOpacity
                                onPress={() => handleSpeakMessage(message.text)}
                                className="flex-row items-center px-5 py-4 border-b border-gray-100"
                            >
                                <Volume2 size={20} color="#446785" />
                                <Text className="text-gray-800 font-medium ml-3 text-base">Speak</Text>
                            </TouchableOpacity>

                            {/* Try Again Option - Only for AI messages */}
                            {!message.isUser && (
                                <TouchableOpacity
                                    onPress={() => handleRetryMessage(message.id)}
                                    className="flex-row items-center px-5 py-4"
                                    disabled={isLoading}
                                >
                                    <RotateCcw size={20} color={isLoading ? "#9CA3AF" : "#446785"} />
                                    <Text className={`font-medium ml-3 text-base ${isLoading ? "text-gray-400" : "text-gray-800"}`}>Try Again</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    return (
        <SafeAreaView className="h-screen bg-white">
            <View className="flex-1 bg-background">
                <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%" }} resizeMode="repeat">
                    {/* Header */}
                    <View className="px-5 py-3 w-full bg-white border-b border-gray-200 rounded-b-3xl" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 }}>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                                    <ChevronLeft size={24} color="#446785" />
                                </TouchableOpacity>
                                <View>
                                    <Text className="text-2xl text-primary-700 font-bold">NarayanGPT</Text>
                                    <Text className="text-sm text-gray-500">AI Spiritual Companion</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity onPress={clearChat} className="p-2">
                                    <BrushCleaningIcon size={22} color="#446785" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={openSidePanel} className="p-2">
                                    <Menu size={22} color="#446785" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Chat Messages */}
                    <View className="flex-1">
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }}
                        />
                        {renderAgenticProgressIndicator()}
                    </View>

                    {/* Input Area */}
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={55} className="bg-white border-t border-gray-200 mb-10">
                        <View className="flex-row items-center px-4 py-2">
                            <View className="flex-1 bg-gray-50 rounded-full px-4 pt-0 pb-3 mr-3">
                                <TextInput className="text-base text-gray-800" placeholder="Type your message..." placeholderTextColor="#9CA3AF" value={inputText} onChangeText={setInputText} multiline maxLength={500} returnKeyType="send" onSubmitEditing={sendMessage} blurOnSubmit={false} editable={!isLoading} />
                            </View>
                            <TouchableOpacity onPress={sendMessage} className={`w-12 h-12 rounded-full items-center justify-center ${inputText.trim() && !isLoading ? "bg-primary-600" : "bg-gray-300"}`} disabled={!inputText.trim() || isLoading}>
                                {isLoading ? <ActivityIndicator size="small" color="white" /> : <Send size={20} color="white" />}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>

                    {/* Side Panel */}
                    <Modal visible={isPanelOpen} transparent animationType="none" onRequestClose={closeSidePanel}>
                        <View className="flex-1 flex-row">
                            {/* Backdrop */}
                            <Animated.View 
                                style={{ 
                                    flex: 1,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    opacity: backdropAnim,
                                }}
                            >
                                <TouchableOpacity 
                                    className="flex-1" 
                                    activeOpacity={1} 
                                    onPress={closeSidePanel} 
                                />
                            </Animated.View>
                            
                            {/* Panel */}
                            <Animated.View
                                style={{
                                    transform: [{ translateX: slideAnim }],
                                    width: SCREEN_WIDTH * 0.85,
                                }}
                                className="bg-white h-full shadow-2xl"
                            >
                                <SafeAreaView className="flex-1">
                                    {/* Panel Header */}
                                    <View className="px-5 py-4 border-b border-gray-200 bg-primary-50">
                                        <View className="flex-row items-center justify-between mb-3">
                                            <Text className="text-xl font-bold text-primary-700">Chat History</Text>
                                            <TouchableOpacity onPress={closeSidePanel}>
                                                <X size={24} color="#446785" />
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity onPress={createNewChatHandler} className="flex-row items-center bg-primary-600 px-4 py-3 rounded-lg">
                                            <Plus size={20} color="white" />
                                            <Text className="text-white font-semibold ml-2">New Chat</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Chat List */}
                                    <ScrollView className="flex-1 px-3 py-2">
                                        {chatConversations.length === 0 ? (
                                            <View className="items-center justify-center py-10">
                                                <MessageSquare size={48} color="#9CA3AF" />
                                                <Text className="text-gray-400 mt-3">No chat history yet</Text>
                                            </View>
                                        ) : (
                                            chatConversations.map((chat) => (
                                                <View key={chat.id} className={`mb-2 rounded-lg overflow-hidden ${chat.id === activeChatId ? "bg-primary-50 border border-primary-300" : "bg-white border border-gray-200"}`}>
                                                    {editingChatId === chat.id ? (
                                                        <View className="flex-row items-center px-4 py-3">
                                                            <TextInput value={editingTitle} onChangeText={setEditingTitle} className="flex-1 text-base font-semibold text-gray-800 border-b border-primary-600 pb-1" autoFocus onBlur={() => saveEditedTitle(chat.id)} onSubmitEditing={() => saveEditedTitle(chat.id)} />
                                                        </View>
                                                    ) : (
                                                        <View className="flex-row items-center">
                                                            <TouchableOpacity onPress={() => switchToChatHandler(chat.id)} className="flex-1 px-4 py-3">
                                                                <Text className={`text-base ${chat.id === activeChatId ? "text-primary-700 font-semibold" : "text-gray-800"}`} numberOfLines={1}>
                                                                    {chat.title}
                                                                </Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity onPress={() => toggleMenu(chat.id)} className="px-3 py-3">
                                                                <MoreVertical size={18} color="#446785" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}

                                                    {/* Dropdown Menu */}
                                                    {openMenuId === chat.id && editingChatId !== chat.id && (
                                                        <View className="border-t border-gray-200 bg-gray-50">
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    startEditingChat(chat.id, chat.title);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex-row items-center px-4 py-3 border-b border-gray-200"
                                                            >
                                                                <Edit2 size={16} color="#446785" />
                                                                <Text className="text-gray-700 ml-3">Rename</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    deleteChatHandler(chat.id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex-row items-center px-4 py-3"
                                                            >
                                                                <Trash2 size={16} color="#DC2626" />
                                                                <Text className="text-red-600 ml-3">Delete</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                            ))
                                        )}
                                    </ScrollView>
                                </SafeAreaView>
                            </Animated.View>
                        </View>
                    </Modal>

                    {/* Message Context Menu */}
                    {renderMessageMenu()}
                </ImageBackground>
            </View>
        </SafeAreaView>
    );
};

export default NarayanGPTScreen;
