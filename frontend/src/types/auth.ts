export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: 'renter' | 'landlord' | 'agent' | 'admin';
  phone_number: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  profile_completed: boolean;
  profile: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_email: string;
  user_full_name: string;
  user_type: string;
  bio: string;
  date_of_birth: string | null;
  avatar: string;
  preferred_counties: number[];
  preferred_towns: number[];
  max_budget: number | null;
  min_bedrooms: number;
  preferred_property_types: string[];
  preferred_furnished: 'any' | 'furnished' | 'unfurnished';
  email_notifications: boolean;
  sms_notifications: boolean;
  new_property_alerts: boolean;
  price_drop_alerts: boolean;
  profile_visibility: 'public' | 'private' | 'landlords_only';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: 'renter' | 'landlord' | 'agent';
  phone_number?: string;
  password: string;
  password_confirm: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone_number: string;
  refresh: string;
  access: string;
  user: User;
}

export interface DashboardStats {
  saved_properties_count: number;
  enquiries_sent_count: number;
  enquiries_replied_count: number;
  recent_activities_count: number;
  profile_completion_percentage: number;
  // For landlords/agents
  properties_listed_count?: number;
  enquiries_received_count?: number;
  properties_views_count?: number;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}