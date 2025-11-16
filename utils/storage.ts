import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  USER_DATA: 'hsapss_user_data',
  TOKENS: 'hsapss_tokens',
  THEME: 'hsapss_theme',
  CHAT_HISTORY: 'hsapss_chat_history',
  CHAT_CONVERSATIONS: 'hsapss_chat_conversations',
  ACTIVE_CHAT_ID: 'hsapss_active_chat_id',
};

export interface ChatConversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
}

export const setUserData = async (data: any) => {
  try {
    await AsyncStorage.setItem(StorageKeys.USER_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(StorageKeys.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const setTokens = async (tokens: any) => {
  try {
    await AsyncStorage.setItem(StorageKeys.TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
};

export const getTokens = async () => {
  try {
    const tokens = await AsyncStorage.getItem(StorageKeys.TOKENS);
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    console.error('Error getting tokens:', error);
    return null;
  }
};

export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem(StorageKeys.USER_DATA);
    await AsyncStorage.removeItem(StorageKeys.TOKENS);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Legacy chat history functions (kept for backward compatibility)
export const setChatHistory = async (messages: any[]) => {
  try {
    await AsyncStorage.setItem(StorageKeys.CHAT_HISTORY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

export const getChatHistory = async () => {
  try {
    const history = await AsyncStorage.getItem(StorageKeys.CHAT_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

export const clearChatHistory = async () => {
  try {
    await AsyncStorage.removeItem(StorageKeys.CHAT_HISTORY);
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

// New multi-conversation chat functions
export const getAllChatConversations = async (): Promise<ChatConversation[]> => {
  try {
    const conversations = await AsyncStorage.getItem(StorageKeys.CHAT_CONVERSATIONS);
    if (conversations) {
      const parsed = JSON.parse(conversations);
      // Sort by updatedAt descending (most recent first)
      return parsed.sort((a: ChatConversation, b: ChatConversation) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('Error getting chat conversations:', error);
    return [];
  }
};

export const saveChatConversation = async (conversation: ChatConversation) => {
  try {
    const conversations = await getAllChatConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }
    
    await AsyncStorage.setItem(StorageKeys.CHAT_CONVERSATIONS, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving chat conversation:', error);
  }
};

export const deleteChatConversation = async (conversationId: string) => {
  try {
    const conversations = await getAllChatConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    await AsyncStorage.setItem(StorageKeys.CHAT_CONVERSATIONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting chat conversation:', error);
  }
};

export const getChatConversation = async (conversationId: string): Promise<ChatConversation | null> => {
  try {
    const conversations = await getAllChatConversations();
    return conversations.find(c => c.id === conversationId) || null;
  } catch (error) {
    console.error('Error getting chat conversation:', error);
    return null;
  }
};

export const setActiveChatId = async (chatId: string) => {
  try {
    await AsyncStorage.setItem(StorageKeys.ACTIVE_CHAT_ID, chatId);
  } catch (error) {
    console.error('Error setting active chat ID:', error);
  }
};

export const getActiveChatId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(StorageKeys.ACTIVE_CHAT_ID);
  } catch (error) {
    console.error('Error getting active chat ID:', error);
    return null;
  }
};

export const renameChatConversation = async (conversationId: string, newTitle: string) => {
  try {
    const conversations = await getAllChatConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.title = newTitle;
      conversation.updatedAt = new Date();
      await saveChatConversation(conversation);
    }
  } catch (error) {
    console.error('Error renaming chat conversation:', error);
  }
};
