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

const mockConversations: Conversation[] = [
  {
    id: '1',
    type: 'dm',
    participants: [
      { id: '2', name: 'Sarah Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', isOnline: true },
    ],
    unreadCount: 2,
  },
  {
    id: '2',
    type: 'group',
    name: 'Design Team',
    participants: [
      { id: '3', name: 'Mike Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', isOnline: true },
      { id: '4', name: 'Emma Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', isOnline: false },
      { id: '5', name: 'Alex Brown', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', isOnline: true },
    ],
    unreadCount: 0,
  },
  {
    id: '3',
    type: 'dm',
    participants: [
      { id: '6', name: 'John Doe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', isOnline: false },
    ],
    unreadCount: 0,
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      conversationId: '1',
      senderId: '2',
      senderName: 'Sarah Johnson',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      content: 'Hey! Did you see the new virtual world I created?',
      timestamp: new Date(Date.now() - 3600000),
      isRead: false,
      type: 'text',
    },
    {
      id: '2',
      conversationId: '1',
      senderId: '2',
      senderName: 'Sarah Johnson',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      content: 'It has a beach theme! 🏖️',
      timestamp: new Date(Date.now() - 3500000),
      isRead: false,
      type: 'text',
    },
  ],
  '2': [
    {
      id: '3',
      conversationId: '2',
      senderId: '3',
      senderName: 'Mike Chen',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      content: 'Team meeting at 3 PM today!',
      timestamp: new Date(Date.now() - 7200000),
      isRead: true,
      type: 'text',
    },
  ],
};

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: mockConversations,
  messages: mockMessages,
  activeConversation: null,

  sendMessage: (conversationId, content, type = 'text', options) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId: '1',
      senderName: 'You',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
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
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
      messages: {
        ...state.messages,
        // Only mark incoming messages as read by the current user.
        // Outgoing messages keep isRead as the recipient-read receipt state.
        [conversationId]: state.messages[conversationId]?.map((msg) =>
          msg.senderId === '1' ? msg : { ...msg, isRead: true }
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
