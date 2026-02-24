import { create } from 'zustand';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'image' | 'video' | 'voice' | 'document';
  mediaUrl?: string;
  fileName?: string;
  twin?: boolean;
  edited?: boolean;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  participants: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  }[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: string[];
}

interface MessageState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversation: string | null;
  sendMessage: (
    conversationId: string,
    content: string,
    type?: Message['type'],
    options?: { twin?: boolean; mediaUrl?: string; fileName?: string }
  ) => void;
  receiveMessage: (conversationId: string, content: string, from?: { id: string; name: string; avatar: string }) => void;
  markAsRead: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  createConversation: (participants: Conversation['participants'], type: 'dm' | 'group', name?: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  deleteConversation: (conversationId: string) => void;
}

function getCurrentUserIdentity() {
  try {
    const id =
      localStorage.getItem('faceme_user_id') ||
      localStorage.getItem('facemex_user_id') ||
      '';
    const name =
      localStorage.getItem('faceme_user_name') ||
      localStorage.getItem('facemex_user_name') ||
      '';
    return { id: String(id || '').trim(), name: String(name || '').trim() };
  } catch {
    return { id: '', name: '' };
  }
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversation: null,

  sendMessage: (conversationId, content, type = 'text', options) => {
    const me = getCurrentUserIdentity();
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId: me.id,
      senderName: me.name || 'You',
      senderAvatar: '',
      content,
      timestamp: new Date(),
      // For outgoing messages, isRead represents whether the recipient has seen it.
      isRead: false,
      type,
      mediaUrl: options?.mediaUrl,
      fileName: options?.fileName,
      twin: options?.twin,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), newMessage],
      },
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, lastMessage: newMessage }
          : conv
      ),
    }));

  },

  receiveMessage: (conversationId, content, from) => {
    const conv = get().conversations.find(c => c.id === conversationId);
    const sender = from || (conv?.type === 'dm' ? conv?.participants[0] : conv?.participants[0]);
    if (!sender) return;
    const newMessage: Message = {
      id: String(Date.now()),
      conversationId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      content,
      timestamp: new Date(),
      isRead: false,
      type: 'text',
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), newMessage],
      },
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newMessage, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ),
    }));

    // AI auto-reply removed
  },

  markAsRead: (conversationId) => {
    const me = getCurrentUserIdentity();
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
      messages: {
        ...state.messages,
        // Only mark incoming messages as read by the current user.
        // Outgoing messages keep isRead as the recipient-read receipt state.
        [conversationId]: state.messages[conversationId]?.map((msg) =>
          me.id && msg.senderId === me.id ? msg : { ...msg, isRead: true }
        ),
      },
    }));
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversation: conversationId });
    if (conversationId) {
      get().markAsRead(conversationId);
    }
  },

  createConversation: (participants, type, name) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      type,
      name,
      participants,
      unreadCount: 0,
    };

    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      messages: { ...state.messages, [newConversation.id]: [] },
    }));
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        
        const typingUsers = conv.isTyping || [];
        return {
          ...conv,
          isTyping: isTyping
            ? [...typingUsers, userId]
            : typingUsers.filter((id) => id !== userId),
        };
      }),
    }));
  },

  deleteMessage: (conversationId, messageId) => {
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      const filtered = convMessages.filter((m) => m.id !== messageId);
      const lastMessage = filtered[filtered.length - 1];
      return {
        messages: {
          ...state.messages,
          [conversationId]: filtered,
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, lastMessage: lastMessage || conv.lastMessage } : conv
        ),
      };
    });
  },

  updateMessage: (conversationId, messageId, content) => {
    set((state) => {
      const updated = (state.messages[conversationId] || []).map((m) =>
        m.id === messageId ? { ...m, content, edited: true } : m
      );
      const lastMessage = updated[updated.length - 1];
      return {
        messages: {
          ...state.messages,
          [conversationId]: updated,
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, lastMessage: lastMessage || conv.lastMessage } : conv
        ),
      };
    });
  },

  deleteConversation: (conversationId) => {
    set((state) => {
      const { [conversationId]: _removed, ...restMessages } = state.messages;
      const nextConversations = state.conversations.filter((c) => c.id !== conversationId);
      return {
        conversations: nextConversations,
        messages: restMessages,
        activeConversation: state.activeConversation === conversationId ? null : state.activeConversation,
      };
    });
  },
}));
