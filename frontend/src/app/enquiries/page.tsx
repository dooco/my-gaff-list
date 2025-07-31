'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Enquiry {
  id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  property_rent: number;
  property_type: string;
  landlord_name: string;
  landlord_email: string;
  message: string;
  status: 'pending' | 'viewed' | 'replied' | 'declined';
  created_at: string;
  viewed_at?: string;
  replied_at?: string;
  landlord_reply?: string;
  follow_up_count: number;
}

export default function Enquiries() {
  const router = useRouter();
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'status' | 'property_title'>('created_at');

  useEffect(() => {
    // Mock data - will be replaced with API calls
    const mockEnquiries: Enquiry[] = [
      {
        id: '1',
        property_id: '1',
        property_title: 'Modern 2 Bed Apartment in Dublin 2',
        property_location: 'Dublin 2',
        property_rent: 2200,
        property_type: 'apartment',
        landlord_name: 'John Smith',
        landlord_email: 'john.smith@email.com',
        message: 'Hi, I\'m very interested in viewing this property. I\'m a working professional with excellent references. When would be a good time for a viewing? I\'m available most evenings and weekends.',
        status: 'replied',
        created_at: '2025-01-25T11:00:00Z',
        viewed_at: '2025-01-25T12:30:00Z',
        replied_at: '2025-01-25T14:20:00Z',
        landlord_reply: 'Thank you for your interest! I can arrange a viewing this Saturday at 2 PM if that works for you. Please let me know if this time is suitable.',
        follow_up_count: 0
      },
      {
        id: '2',
        property_id: '2',
        property_title: 'Spacious House in Cork City Centre',
        property_location: 'Cork City',
        property_rent: 1800,
        property_type: 'house',
        landlord_name: 'Mary O\'Brien',
        landlord_email: 'mary.obrien@email.com',
        message: 'Is this property still available? I would like to schedule a viewing as soon as possible. I have a stable job and can provide references.',
        status: 'viewed',
        created_at: '2025-01-24T16:30:00Z',
        viewed_at: '2025-01-24T18:45:00Z',
        follow_up_count: 1
      },
      {
        id: '3',
        property_id: '3',
        property_title: 'Cozy Studio in Temple Bar',
        property_location: 'Dublin 1',
        property_rent: 1500,
        property_type: 'studio',
        landlord_name: 'David Murphy',
        landlord_email: 'david.murphy@email.com',
        message: 'What\'s included in the rent? Are utilities covered? Also, is parking available?',
        status: 'pending',
        created_at: '2025-01-23T10:45:00Z',
        follow_up_count: 0
      },
      {
        id: '4',
        property_id: '4',
        property_title: 'Luxury 1 Bed Apartment with Balcony',
        property_location: 'Galway City',
        property_rent: 1900,
        property_type: 'apartment',
        landlord_name: 'Sarah Walsh',
        landlord_email: 'sarah.walsh@email.com',
        message: 'I\'m relocating to Galway for work and this property looks perfect. Can we arrange a virtual viewing first?',
        status: 'declined',
        created_at: '2025-01-22T09:15:00Z',
        viewed_at: '2025-01-22T11:20:00Z',
        replied_at: '2025-01-22T15:30:00Z',
        landlord_reply: 'Thank you for your interest, but we\'ve decided to go with another tenant who can view in person.',
        follow_up_count: 0
      },
      {
        id: '5',
        property_id: '5',
        property_title: 'Student-Friendly House Share',
        property_location: 'Cork',
        property_rent: 650,
        property_type: 'house_share',
        landlord_name: 'Tom Collins',
        landlord_email: 'tom.collins@email.com',
        message: 'Hi, I\'m a final year student at UCC. Is this room still available for the upcoming semester?',
        status: 'replied',
        created_at: '2025-01-21T11:10:00Z',
        viewed_at: '2025-01-21T13:25:00Z',
        replied_at: '2025-01-21T16:40:00Z',
        landlord_reply: 'Yes, the room is still available! Can you come for a viewing this week?',
        follow_up_count: 2
      },
      {
        id: '6',
        property_id: '6',
        property_title: 'Family Home in Suburbia',
        property_location: 'Dublin 15',
        property_rent: 2400,
        property_type: 'house',
        landlord_name: 'Lisa Johnson',
        landlord_email: 'lisa.johnson@email.com',
        message: 'We\'re a family of four looking for a long-term rental. Is this property pet-friendly?',
        status: 'pending',
        created_at: '2025-01-20T14:20:00Z',
        follow_up_count: 0
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setEnquiries(mockEnquiries);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredAndSortedEnquiries = enquiries
    .filter(enquiry => {
      const matchesSearch = 
        enquiry.property_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.property_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.landlord_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else {
        return a.property_title.localeCompare(b.property_title);
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'replied':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'viewed':
        return <EyeIcon className="h-5 w-5 text-blue-500" />;
      case 'declined':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'replied':
        return 'Replied';
      case 'viewed':
        return 'Viewed';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'viewed':
        return 'bg-blue-100 text-blue-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPropertyTypeDisplay = (type: string) => {
    switch (type) {
      case 'apartment': return 'Apartment';
      case 'house': return 'House';
      case 'studio': return 'Studio';
      case 'house_share': return 'House Share';
      default: return type;
    }
  };

  const statusCounts = {
    all: enquiries.length,
    pending: enquiries.filter(e => e.status === 'pending').length,
    viewed: enquiries.filter(e => e.status === 'viewed').length,
    replied: enquiries.filter(e => e.status === 'replied').length,
    declined: enquiries.filter(e => e.status === 'declined').length
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your enquiries...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-6 w-6 text-blue-500 mr-2" />
                  My Enquiries
                </h1>
                <p className="text-gray-600 mt-1">
                  {enquiries.length} {enquiries.length === 1 ? 'enquiry' : 'enquiries'} sent
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Properties
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'All Enquiries', count: statusCounts.all },
                  { key: 'pending', label: 'Pending', count: statusCounts.pending },
                  { key: 'viewed', label: 'Viewed', count: statusCounts.viewed },
                  { key: 'replied', label: 'Replied', count: statusCounts.replied },
                  { key: 'declined', label: 'Declined', count: statusCounts.declined }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        statusFilter === tab.key
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search enquiries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'status' | 'property_title')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Sort by Date</option>
                <option value="status">Sort by Status</option>
                <option value="property_title">Sort by Property</option>
              </select>
            </div>
          </div>

          {/* Enquiries List */}
          {filteredAndSortedEnquiries.length > 0 ? (
            <div className="space-y-6">
              {filteredAndSortedEnquiries.map((enquiry) => (
                <div key={enquiry.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {enquiry.property_title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(enquiry.status)}`}>
                            {getStatusIcon(enquiry.status)}
                            <span className="ml-1">{getStatusText(enquiry.status)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {enquiry.property_location}
                          </div>
                          <span>€{enquiry.property_rent.toLocaleString()}/month</span>
                          <span>{getPropertyTypeDisplay(enquiry.property_type)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Sent {formatDate(enquiry.created_at)}
                        </div>
                        {enquiry.follow_up_count > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            {enquiry.follow_up_count} follow-up{enquiry.follow_up_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Your Message */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Your Message:</h4>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{enquiry.message}</p>
                      </div>
                    </div>

                    {/* Landlord Info */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-600">Landlord: </span>
                          <span className="text-sm font-medium text-gray-900">{enquiry.landlord_name}</span>
                        </div>
                        {enquiry.viewed_at && (
                          <div className="text-xs text-gray-500">
                            Viewed {formatDate(enquiry.viewed_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Landlord Reply */}
                    {enquiry.landlord_reply && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                          Landlord Reply:
                        </h4>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{enquiry.landlord_reply}</p>
                          {enquiry.replied_at && (
                            <div className="text-xs text-gray-500 mt-2">
                              Replied {formatDate(enquiry.replied_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                      <button
                        onClick={() => router.push(`/property/${enquiry.property_id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Property
                      </button>
                      <div className="flex gap-2">
                        {enquiry.status === 'replied' && (
                          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                            Reply
                          </button>
                        )}
                        {enquiry.status === 'pending' && (
                          <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                            Follow Up
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                {searchTerm || statusFilter !== 'all' ? (
                  <>
                    <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No enquiries found</h3>
                    <p className="text-gray-600 mb-4">
                      No enquiries match your current filters
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No enquiries yet</h3>
                    <p className="text-gray-600 mb-6">
                      Start browsing properties and contact landlords to see your enquiries here
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Browse Properties
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}