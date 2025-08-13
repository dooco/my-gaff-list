'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { authService } from '@/services/authService';
import VerificationStatus from '@/components/verification/VerificationStatus';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  BellIcon,
  EyeIcon,
  PencilIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  user_type: 'renter' | 'landlord' | 'agent' | 'admin';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: string;
  profile: {
    avatar?: string;
    bio?: string;
    occupation?: string;
    company?: string;
    website?: string;
    location?: string;
    preferred_contact_method: 'email' | 'phone' | 'both';
    receive_email_notifications: boolean;
    receive_sms_notifications: boolean;
    profile_visibility: 'public' | 'private' | 'contacts_only';
  };
}

interface NotificationSettings {
  new_properties: boolean;
  price_drops: boolean;
  enquiry_responses: boolean;
  property_updates: boolean;
  marketing_emails: boolean;
}

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy' | 'verification'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    occupation: '',
    company: '',
    website: '',
    location: ''
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    new_properties: true,
    price_drops: true,
    enquiry_responses: true,
    property_updates: false,
    marketing_emails: false
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          // Fetch real user profile data
          const [userProfile, profileDetails] = await Promise.all([
            authService.getCurrentUser(),
            authService.getUserProfileDetails()
          ]);

          const combinedProfile: UserProfile = {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
            first_name: userProfile.first_name || '',
            last_name: userProfile.last_name || '',
            phone: userProfile.phone_number || '',
            date_of_birth: profileDetails.date_of_birth,
            user_type: userProfile.user_type,
            is_email_verified: userProfile.is_email_verified || false,
            is_phone_verified: userProfile.is_phone_verified || false,
            created_at: userProfile.created_at,
            profile: {
              avatar: profileDetails.avatar || '',
              bio: profileDetails.bio || '',
              occupation: '', // Not in current backend model
              company: '', // Not in current backend model
              website: '', // Not in current backend model
              location: '', // Not in current backend model
              preferred_contact_method: 'email',
              receive_email_notifications: profileDetails.email_notifications,
              receive_sms_notifications: profileDetails.sms_notifications,
              profile_visibility: profileDetails.profile_visibility
            }
          };

          setProfile(combinedProfile);
          setProfileForm({
            first_name: combinedProfile.first_name,
            last_name: combinedProfile.last_name,
            phone: combinedProfile.phone || '',
            bio: combinedProfile.profile.bio || '',
            occupation: '', // Not in backend model yet
            company: '', // Not in backend model yet
            website: '', // Not in backend model yet
            location: '' // Not in backend model yet
          });

          // Set notification settings from profile details
          setNotificationSettings({
            new_properties: profileDetails.new_property_alerts,
            price_drops: profileDetails.price_drop_alerts,
            enquiry_responses: true, // Default
            property_updates: false, // Default
            marketing_emails: false // Default
          });

          setLoading(false);
        } catch (error) {
          console.error('Error fetching profile:', error);
          setMessage({ type: 'error', text: 'Failed to load profile data' });
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      // Update user basic info
      const userUpdateData = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone_number: profileForm.phone,
      };

      // Update profile details
      const profileUpdateData = {
        bio: profileForm.bio,
      };

      // Make API calls
      const [updatedUser, updatedProfileDetails] = await Promise.all([
        authService.updateProfile(userUpdateData),
        authService.updateUserProfileDetails(profileUpdateData)
      ]);

      // Update local profile state
      if (profile) {
        const updatedProfile = {
          ...profile,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone_number,
          profile: {
            ...profile.profile,
            bio: updatedProfileDetails.bio
          }
        };
        setProfile(updatedProfile);
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaveLoading(true);
    try {
      // Update notification preferences
      const notificationData = {
        email_notifications: true, // General email notifications
        sms_notifications: false, // General SMS notifications
        new_property_alerts: notificationSettings.new_properties,
        price_drop_alerts: notificationSettings.price_drops,
      };

      await authService.updateUserProfileDetails(notificationData);
      setMessage({ type: 'success', text: 'Notification settings updated!' });
    } catch (error) {
      console.error('Error updating notifications:', error);
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType) {
      case 'renter': return 'Renter';
      case 'landlord': return 'Landlord';
      case 'agent': return 'Estate Agent';
      case 'admin': return 'Administrator';
      default: return userType;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load profile</p>
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
                  <UserIcon className="h-6 w-6 text-blue-500 mr-2" />
                  Account Settings
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your account information and preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-medium">
                    {profile.profile.avatar ? (
                      <img 
                        src={profile.profile.avatar} 
                        alt={`${profile.first_name} ${profile.last_name}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      `${profile.first_name?.[0] || '?'}${profile.last_name?.[0] || ''}`
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{getUserTypeDisplay(profile.user_type)}</p>
                  </div>
                </div>

                <nav className="space-y-2">
                  {[
                    { key: 'profile', label: 'Profile Information', icon: UserIcon },
                    { key: 'account', label: 'Account Security', icon: KeyIcon },
                    { key: 'verification', label: 'Verification', icon: ShieldCheckIcon },
                    { key: 'notifications', label: 'Notifications', icon: BellIcon },
                    { key: 'privacy', label: 'Privacy Settings', icon: EyeIcon }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {message.type === 'success' ? (
                      <CheckCircleIconSolid className="h-5 w-5 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    )}
                    {message.text}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileForm.first_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.first_name || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileForm.last_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.last_name || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-gray-900">{profile.email}</span>
                          {profile.is_email_verified ? (
                            <CheckCircleIconSolid className="h-5 w-5 text-green-500 ml-2" />
                          ) : (
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 ml-2" />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center">
                            <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-gray-900">{profile.phone || 'Not provided'}</span>
                            {profile.is_phone_verified && profile.phone && (
                              <CheckCircleIconSolid className="h-5 w-5 text-green-500 ml-2" />
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Occupation
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileForm.occupation}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, occupation: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.profile.occupation || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileForm.company}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, company: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.profile.company || 'Not provided'}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Location
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileForm.location}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center">
                            <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-gray-900">{profile.profile.location || 'Not provided'}</span>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        {isEditing ? (
                          <textarea
                            value={profileForm.bio}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tell us a bit about yourself..."
                          />
                        ) : (
                          <p className="text-gray-900">{profile.profile.bio || 'No bio provided'}</p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saveLoading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          {saveLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      {[
                        { key: 'new_properties', label: 'New Properties', description: 'Get notified when new properties matching your criteria are listed' },
                        { key: 'price_drops', label: 'Price Drops', description: 'Receive alerts when properties in your saved list reduce their rent' },
                        { key: 'enquiry_responses', label: 'Enquiry Responses', description: 'Get notified when landlords respond to your enquiries' },
                        { key: 'property_updates', label: 'Property Updates', description: 'Receive updates about changes to your saved properties' },
                        { key: 'marketing_emails', label: 'Marketing Emails', description: 'Receive promotional emails and property recommendations' }
                      ].map(setting => (
                        <div key={setting.key} className="flex items-start">
                          <input
                            type="checkbox"
                            id={setting.key}
                            checked={notificationSettings[setting.key as keyof NotificationSettings]}
                            onChange={(e) => setNotificationSettings(prev => ({
                              ...prev,
                              [setting.key]: e.target.checked
                            }))}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <label htmlFor={setting.key} className="text-sm font-medium text-gray-900">
                              {setting.label}
                            </label>
                            <p className="text-sm text-gray-500">{setting.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={saveLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {saveLoading ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Password</h3>
                            <p className="text-sm text-gray-500">Last updated 3 months ago</p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Change Password
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500">Add an extra layer of security</p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Enable 2FA
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-gray-600">Member since: </span>
                          <span className="text-sm font-medium text-gray-900">{formatDate(profile.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Account type: </span>
                          <span className="text-sm font-medium text-gray-900">{getUserTypeDisplay(profile.user_type)}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Username: </span>
                          <span className="text-sm font-medium text-gray-900">{profile.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'verification' && (
                <VerificationStatus />
              )}

              {activeTab === 'privacy' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          Profile Visibility
                        </label>
                        <div className="space-y-3">
                          {[
                            { value: 'public', label: 'Public', description: 'Your profile is visible to everyone' },
                            { value: 'contacts_only', label: 'Contacts Only', description: 'Only landlords you\'ve contacted can see your profile' },
                            { value: 'private', label: 'Private', description: 'Your profile is hidden from everyone' }
                          ].map(option => (
                            <div key={option.value} className="flex items-start">
                              <input
                                type="radio"
                                id={option.value}
                                name="profile_visibility"
                                value={option.value}
                                checked={profile.profile.profile_visibility === option.value}
                                onChange={() => {
                                  // Handle radio change
                                }}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <div className="ml-3">
                                <label htmlFor={option.value} className="text-sm font-medium text-gray-900">
                                  {option.label}
                                </label>
                                <p className="text-sm text-gray-500">{option.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}