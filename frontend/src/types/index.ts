export interface User {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  photoUrl?: string | null;
  isOnline: boolean;
  lastSeen: string;
}

export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
}

export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface Conversation {
  id: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageStatus?: MessageStatus | null;
  unreadCount?: number;
  members: ConversationMember[];
}

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  reactions?: Reaction[];
}

export interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  sender: User;
}
