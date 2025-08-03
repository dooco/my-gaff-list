export interface County {
  id: number;
  name: string;
  slug: string;
  towns_count: number;
}

export interface Town {
  id: number;
  name: string;
  slug: string;
  county: number;
  county_name: string;
}

export interface Landlord {
  id: number;
  name: string;
  display_name: string;
  user_type: 'landlord' | 'agent' | 'property_manager';
  company_name?: string;
  is_verified: boolean;
  verification_date?: string;
  preferred_contact_method: 'phone' | 'email' | 'both';
  response_time_hours: number;
  phone?: string;
  email?: string;
  contact_method: 'direct' | 'message_only';
}

export interface Property {
  id: string;
  title: string;
  property_type: 'apartment' | 'house' | 'shared' | 'studio' | 'townhouse';
  bedrooms: number;
  bathrooms: number;
  rent_monthly: string;
  ber_rating: string;
  ber_color_class: string;
  furnished: 'furnished' | 'unfurnished' | 'part_furnished';
  main_image_url?: string;
  location_display: string;
  county_name: string;
  town_name: string;
  available_from: string;
  created_at: string;
  features: string[];
  landlord?: Landlord;
  owner?: string;
}

export interface PropertyDetail extends Property {
  description: string;
  house_type?: string;
  floor_area?: number;
  deposit?: string;
  ber_number: string;
  images: string[];
  main_image_url?: string;
  lease_duration?: string;
  address: string;
  updated_at: string;
  county_name: string;
  town_name: string;
  latitude?: number;
  longitude?: number;
  landlord: Landlord;
  owner?: string;
}

export interface PropertyFilters {
  county?: string;
  town?: string;
  property_type?: string;
  bedrooms?: number;
  bedrooms_min?: number;
  bedrooms_max?: number;
  rent_min?: number;
  rent_max?: number;
  ber_rating?: string[];
  furnished?: string;
  search?: string;
}

export interface FilterOptions {
  property_types: { value: string; label: string }[];
  house_types: { value: string; label: string }[];
  ber_ratings: { value: string; label: string }[];
  furnished_options: { value: string; label: string }[];
  bedroom_options: { value: number; label: string }[];
  price_ranges: { value: string; label: string }[];
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}