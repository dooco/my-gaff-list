'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  XMarkIcon, 
  PaperAirplaneIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ContactLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: string;
    rent_monthly: string;
    location_display: string;
    landlord?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  onSuccess?: () => void;
}

interface EnquiryForm {
  message: string;
  phone: string;
  preferred_contact_method: 'email' | 'phone' | 'both';
  viewing_preference: 'flexible' | 'weekdays' | 'weekends' | 'evenings';
}

export default function ContactLandlordModal({ 
  isOpen, 
  onClose, 
  property, 
  onSuccess 
}: ContactLandlordModalProps) {
  const { user, isAuthenticated, tokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState<EnquiryForm>({
    message: `Hi,

I'm interested in viewing this property: ${property.title}.

Could you please let me know when would be a good time for a viewing? I'm available most days and can be flexible with timing.

I'm a reliable tenant with good references and steady employment. Please let me know if you need any additional information.

Looking forward to hearing from you.

Best regards,
${user?.first_name || 'Name'}`,
    phone: user?.phone || '',
    preferred_contact_method: 'email',
    viewing_preference: 'flexible'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      // Call the real API endpoint
      const response = await fetch(`${BASE_URL}/api/users/properties/enquiry/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.access}`,
        },
        body: JSON.stringify({
          property_id: property.id,
          message: form.message,
          phone: form.phone,
          preferred_contact_method: form.preferred_contact_method,
          viewing_preference: form.viewing_preference,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send enquiry');
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to send enquiry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send enquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EnquiryForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contact Landlord</h2>
            <p className="text-sm text-gray-600 mt-1">Send an enquiry about this property</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Property Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">{property.title}</h3>
              <p className="text-sm text-gray-600">{property.location_display}</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                €{parseFloat(property.rent_monthly).toLocaleString()}/month
              </p>
            </div>
            {property.landlord && (
              <div className="text-right">
                <div className="flex items-center text-sm text-gray-600">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {property.landlord.name}
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  {property.landlord.email}
                </div>
                {property.landlord.phone && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {property.landlord.phone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {success ? (
          /* Success State */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enquiry Sent Successfully!</h3>
            <p className="text-gray-600 mb-4">
              Your message has been sent to the landlord. You should receive a response within 24-48 hours.
            </p>
            <p className="text-sm text-gray-500">
              You can track this enquiry in your <a href="/enquiries" className="text-blue-600 hover:text-blue-700">dashboard</a>.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message *
                </label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={8}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Write your message here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific about your interest and availability for viewings
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+353 XX XXX XXXX"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preferred Contact Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Contact Method
                  </label>
                  <select
                    value={form.preferred_contact_method}
                    onChange={(e) => handleInputChange('preferred_contact_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Viewing Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viewing Availability
                  </label>
                  <select
                    value={form.viewing_preference}
                    onChange={(e) => handleInputChange('viewing_preference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="weekdays">Weekdays only</option>
                    <option value="weekends">Weekends only</option>
                    <option value="evenings">Evenings only</option>
                  </select>
                </div>
              </div>

              {/* Contact Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Your Contact Information</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  {form.phone && <p><strong>Phone:</strong> {form.phone}</p>}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  This information will be shared with the landlord along with your message.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !form.message.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Send Enquiry
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}