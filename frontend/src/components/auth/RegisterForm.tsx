'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon, UserIcon, HomeIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { RegisterData } from '@/types/auth';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

type FormErrors = Partial<RegisterData & { terms: string }>;

export default function RegisterForm({ 
  onSuccess, 
  onSwitchToLogin, 
  className = '' 
}: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    user_type: 'renter',
    phone_number: '',
    password: '',
    password_confirm: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  };

  const handleUserTypeSelect = (userType: 'renter' | 'landlord' | 'agent') => {
    setFormData(prev => ({ ...prev, user_type: userType }));
    if (fieldErrors.user_type) {
      setFieldErrors(prev => ({ ...prev, user_type: '' }));
    }
  };

  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: FormErrors = {};

    // User type validation
    if (!formData.user_type) {
      errors.user_type = 'Please select your account type';
    }

    // Phone validation (optional but if provided should be valid)
    if (formData.phone_number && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone_number)) {
      errors.phone_number = 'Please enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: FormErrors = {};

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Password confirmation validation
    if (!formData.password_confirm) {
      errors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      errors.password_confirm = 'Passwords do not match';
    }

    // Terms acceptance
    if (!acceptedTerms) {
      errors.terms = 'You must accept the terms and conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }

    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) return;

    try {
      await register(formData);
      onSuccess?.();
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'renter': return <UserIcon className="h-6 w-6" />;
      case 'landlord': return <HomeIcon className="h-6 w-6" />;
      case 'agent': return <BuildingOfficeIcon className="h-6 w-6" />;
      default: return <UserIcon className="h-6 w-6" />;
    }
  };

  const getUserTypeDescription = (type: string) => {
    switch (type) {
      case 'renter': return 'Looking for a place to rent';
      case 'landlord': return 'I own properties to rent';
      case 'agent': return 'I represent multiple properties';
      default: return '';
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join the My Gaff List community</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Personal Info</span>
          <span>Account Type</span>
          <span>Security</span>
        </div>
      </div>

      {/* General Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.first_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="First name"
                />
                {fieldErrors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.last_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Last name"
                />
                {fieldErrors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Choose a username"
              />
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
              )}
            </div>
          </>
        )}

        {/* Step 2: Account Type */}
        {currentStep === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What best describes you?
              </label>
              <div className="space-y-3">
                {(['renter', 'landlord', 'agent'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUserTypeSelect(type)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      formData.user_type === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full ${
                        formData.user_type === type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getUserTypeIcon(type)}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900 capitalize">{type}</div>
                        <div className="text-sm text-gray-500">{getUserTypeDescription(type)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {fieldErrors.user_type && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.user_type}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.phone_number ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+353 1 234 5678"
              />
              {fieldErrors.phone_number && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone_number}</p>
              )}
            </div>
          </>
        )}

        {/* Step 3: Security */}
        {currentStep === 3 && (
          <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="password_confirm"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.password_confirm ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {fieldErrors.password_confirm && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password_confirm}</p>
              )}
            </div>

            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.terms}</p>
              )}
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Previous
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="ml-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="ml-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          )}
        </div>

        {/* Switch to Login */}
        {onSwitchToLogin && (
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}