export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'landlord' | 'tenant' | 'renter' | 'agent';
  profile_image?: string;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  price?: number;
  image?: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: User;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_edited: boolean;
  is_read: boolean;
  read_at: string | null;
  is_system_message: boolean;
  // Additional fields for real-time status
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  property: Property | null;
  participant1: User;
  participant2: User;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_at: string;
  last_message_by: User;
  unread_count: number;
  other_participant: User;
  is_archived: boolean;
  messages?: Message[];
  // Additional fields for real-time
  is_online?: boolean;
  last_seen?: string;
}