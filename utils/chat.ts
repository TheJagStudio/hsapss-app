import {
    getAllChatConversations,
    saveChatConversation,
    deleteChatConversation,
    getChatConversation,
    setActiveChatId,
    getActiveChatId,
    renameChatConversation,
    ChatConversation,
} from "./storage";
import { Message, generateChatTitle } from "./llm";

// Default welcome message
export const DEFAULT_WELCOME_MESSAGE: Message = {
    id: "1",
    text: "Hello! I am NarayanGPT, your spiritual companion. How can I help you today?",
    isUser: false,
    timestamp: new Date(),
};

/**
 * Loads all chat conversations and returns the active chat
 */
export const loadChatConversations = async (
    currentMessages: Message[]
): Promise<{
    conversations: ChatConversation[];
    activeChatId: string;
    messages: Message[];
}> => {
    try {
        const conversations = await getAllChatConversations();

        // Get active chat ID
        let activeId = await getActiveChatId();

        // If no active chat or active chat doesn't exist, create a new one
        if (!activeId || !conversations.find((c) => c.id === activeId)) {
            activeId = Date.now().toString();
            await setActiveChatId(activeId);

            // Create new conversation
            const newConversation: ChatConversation = {
                id: activeId,
                title: "New Chat",
                messages: currentMessages,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await saveChatConversation(newConversation);

            return {
                conversations: [newConversation, ...conversations],
                activeChatId: activeId,
                messages: currentMessages,
            };
        } else {
            // Load the active chat
            const activeChat = await getChatConversation(activeId);
            const messages =
                activeChat && activeChat.messages.length > 0
                    ? activeChat.messages
                    : currentMessages;

            return {
                conversations,
                activeChatId: activeId,
                messages,
            };
        }
    } catch (error) {
        console.error("Error loading chat conversations:", error);
        throw error;
    }
};

/**
 * Saves the current chat conversation
 */
export const saveCurrentChat = async (
    activeChatId: string | null,
    messages: Message[],
    chatConversations: ChatConversation[]
): Promise<ChatConversation | null> => {
    try {
        if (!activeChatId) return null;

        // Don't save if we only have the default welcome message
        if (messages.length === 1 && messages[0].id === "1") {
            return null;
        }

        // Generate title from first user message if it's a new chat
        const currentChat = chatConversations.find((c) => c.id === activeChatId);
        let title = currentChat?.title || "New Chat";

        if (title === "New Chat" && messages.length > 1) {
            const firstUserMessage = messages.find((m) => m.isUser);
            if (firstUserMessage) {
                title = generateChatTitle(firstUserMessage.text);
            }
        }

        const conversation: ChatConversation = {
            id: activeChatId,
            title: title,
            messages: messages,
            createdAt: currentChat?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        await saveChatConversation(conversation);

        return conversation;
    } catch (error) {
        console.error("Error saving current chat:", error);
        return null;
    }
};

/**
 * Creates a new chat conversation
 */
export const createNewChat = async (): Promise<{
    chatId: string;
    conversation: ChatConversation;
    messages: Message[];
}> => {
    try {
        const newChatId = Date.now().toString();
        await setActiveChatId(newChatId);

        // Reset to default message
        const defaultMessages = [DEFAULT_WELCOME_MESSAGE];

        // Create new conversation
        const newConversation: ChatConversation = {
            id: newChatId,
            title: "New Chat",
            messages: defaultMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await saveChatConversation(newConversation);

        return {
            chatId: newChatId,
            conversation: newConversation,
            messages: defaultMessages,
        };
    } catch (error) {
        console.error("Error creating new chat:", error);
        throw error;
    }
};

/**
 * Switches to a different chat conversation
 */
export const switchToChat = async (
    chatId: string,
    currentActiveChatId: string | null,
    currentMessages: Message[],
    chatConversations: ChatConversation[]
): Promise<{ messages: Message[]; chatId: string } | null> => {
    try {
        // Save current chat before switching
        if (currentActiveChatId) {
            await saveCurrentChat(currentActiveChatId, currentMessages, chatConversations);
        }

        // Load the selected chat
        const chat = await getChatConversation(chatId);
        if (chat) {
            await setActiveChatId(chatId);
            return {
                messages: chat.messages,
                chatId: chatId,
            };
        }

        return null;
    } catch (error) {
        console.error("Error switching chat:", error);
        return null;
    }
};

/**
 * Deletes a chat conversation
 */
export const deleteChat = async (
    chatId: string,
    activeChatId: string | null
): Promise<{ shouldCreateNew: boolean }> => {
    try {
        await deleteChatConversation(chatId);

        // If deleted chat was active, need to create a new one
        const shouldCreateNew = chatId === activeChatId;

        return { shouldCreateNew };
    } catch (error) {
        console.error("Error deleting chat:", error);
        throw error;
    }
};

/**
 * Renames a chat conversation
 */
export const renameChat = async (
    chatId: string,
    newTitle: string
): Promise<boolean> => {
    try {
        if (newTitle.trim()) {
            await renameChatConversation(chatId, newTitle.trim());
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error renaming chat:", error);
        return false;
    }
};

/**
 * Clears the current chat (deletes it and creates a new one)
 */
export const clearCurrentChat = async (
    activeChatId: string | null
): Promise<{
    chatId: string;
    conversation: ChatConversation;
    messages: Message[];
}> => {
    try {
        if (activeChatId) {
            await deleteChatConversation(activeChatId);
        }

        // Create a new chat
        return await createNewChat();
    } catch (error) {
        console.error("Error clearing chat:", error);
        throw error;
    }
};
