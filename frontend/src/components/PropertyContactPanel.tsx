'use client';

import { useState } from 'react';
import { CheckBadgeIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { Property } from '@/types/property';
import { useAuth } from '@/hooks/useAuth';
import ContactLandlordModal from './ContactLandlordModal';

interface PropertyContactPanelProps {
  property: Property;
  onEnquiry: (enquiryData: EnquiryFormData) => void;
  className?: string;
}

interface EnquiryFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function PropertyContactPanel({ 
  property, 
  onEnquiry, 
  className = '' 
}: PropertyContactPanelProps) {
  const { isAuthenticated } = useAuth();
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [formData, setFormData] = useState<EnquiryFormData>({
    name: '',
    email: '',
    phone: '',
    message: `Hi, I'm interested in the property "${property.title}". Could you please provide more information?`
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const landlord = property.landlord;
  const isVerified = landlord?.is_verified || false;
  const contactMethod = landlord?.contact_method || 'message_only';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onEnquiry(formData);
      setShowEnquiryForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: `Hi, I'm interested in the property "${property.title}". Could you please provide more information?`
      });
    } catch (error) {
      console.error('Failed to send enquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!landlord) {
    return (
      <div className={`bg-gray-100 border border-gray-200 rounded-lg p-6 ${className}`}>
        <p className="text-gray-600">Contact information not available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Landlord Info Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {landlord.display_name || landlord.name}
              </h3>
              {isVerified && (
                <div className="flex items-center">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                  <span className="ml-1 text-sm text-green-600 font-medium">Verified</span>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p className="capitalize">{landlord.user_type.replace('_', ' ')}</p>
              {landlord.company_name && (
                <p>{landlord.company_name}</p>
              )}
              {landlord.response_time_hours && (
                <p>Typical response: {landlord.response_time_hours}h</p>
              )}
            </div>
          </div>
          
          {!isVerified && (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Unverified
            </div>
          )}
        </div>
      </div>

      {/* Contact Methods */}
      <div className="p-6">
        {contactMethod === 'direct' && isVerified ? (
          /* Verified landlords - show direct contact options */
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 mb-4">Contact directly:</h4>
            
            {landlord.phone && (
              <a
                href={`tel:${landlord.phone}`}
                className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-blue-700 hover:text-blue-800"
              >
                <PhoneIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Call Now</div>
                  <div className="text-sm">{landlord.phone}</div>
                </div>
              </a>
            )}
            
            {landlord.email && (
              <a
                href={`mailto:${landlord.email}?subject=Enquiry about ${property.title}`}
                className="flex items-center gap-3 p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors duration-200 text-green-700 hover:text-green-800"
              >
                <EnvelopeIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Email Direct</div>
                  <div className="text-sm">{landlord.email}</div>
                </div>
              </a>
            )}
            
            {/* Optional message form for verified landlords too */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => isAuthenticated ? setShowContactModal(true) : setShowEnquiryForm(!showEnquiryForm)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                {isAuthenticated ? 'Or send a secure message' : 'Or send a message through the site'}
              </button>
            </div>
          </div>
        ) : (
          /* Non-verified landlords - message only */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Send a message</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Contact this {landlord.user_type.replace('_', ' ')} through our secure messaging system.
              {!isVerified && " Direct contact details are only available for verified landlords."}
            </p>
            <button
              onClick={() => isAuthenticated ? setShowContactModal(true) : setShowEnquiryForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isAuthenticated ? 'Contact Landlord' : 'Sign In to Contact'}
            </button>
          </div>
        )}

        {/* Enquiry Form Modal/Dropdown */}
        {showEnquiryForm && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Phone (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEnquiryForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contact Modal for Authenticated Users */}
        {isAuthenticated && (
          <ContactLandlordModal
            isOpen={showContactModal}
            onClose={() => setShowContactModal(false)}
            property={{
              id: property.id,
              title: property.title,
              rent_monthly: property.rent_monthly,
              location_display: property.location_display,
              landlord: {
                name: landlord?.display_name || landlord?.name || 'Property Owner',
                email: landlord?.email || '',
                phone: landlord?.phone
              },
              owner: property.owner
            }}
            onSuccess={() => {
              setShowContactModal(false);
              // Could show success toast here
            }}
          />
        )}
      </div>
    </div>
  );
}