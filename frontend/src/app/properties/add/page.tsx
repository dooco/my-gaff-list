'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Home, DollarSign, Calendar, ImageIcon, Plus, X } from 'lucide-react'
import LandlordOrAgentRoute from '@/components/auth/LandlordOrAgentRoute'
import api from '@/lib/api'

interface PropertyForm {
  title: string
  description: string
  property_type: string
  house_type: string
  bedrooms: number
  bathrooms: number
  rent_monthly: string
  ber_rating: string
  furnished: string
  county: string
  town: string
  address: string
  available_from: string
  lease_duration: string
  deposit: string
  contact_method: string
  features: string[]
  images: File[]
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'studio', label: 'Studio' },
  { value: 'shared', label: 'Shared Accommodation' },
  { value: 'room', label: 'Room' }
]

const HOUSE_TYPES = [
  { value: 'detached', label: 'Detached House' },
  { value: 'semi_detached', label: 'Semi-Detached House' },
  { value: 'terraced', label: 'Terraced House' },
  { value: 'end_terrace', label: 'End of Terrace House' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'duplex', label: 'Duplex' }
]

const BER_RATINGS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'A3', label: 'A3' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'B3', label: 'B3' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'C3', label: 'C3' },
  { value: 'D1', label: 'D1' },
  { value: 'D2', label: 'D2' },
  { value: 'E1', label: 'E1' },
  { value: 'E2', label: 'E2' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' }
]

const FURNISHED_OPTIONS = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'part_furnished', label: 'Part Furnished' }
]

const CONTACT_METHODS = [
  { value: 'direct', label: 'Direct Contact' },
  { value: 'message_only', label: 'Message Only' }
]

const COMMON_FEATURES = [
  'Parking',
  'Garden',
  'Balcony',
  'City Views',
  'Modern Kitchen',
  'En-suite',
  'Walk-in Wardrobe',
  'Storage',
  'Dishwasher',
  'Washing Machine',
  'Dryer',
  'Central Heating',
  'Double Glazing',
  'Alarm System',
  'Internet/WiFi',
  'Cable TV',
  'Near Transport',
  'Near Schools',
  'Near Shops',
  'Quiet Area',
  'Family Friendly',
  'Professional Area',
  'Student Friendly',
  'Pet Friendly',
  'Wheelchair Accessible',
  'Gym/Fitness',
  'Concierge',
  'Lift/Elevator'
]

export default function AddPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [counties, setCounties] = useState<Array<{id: string, name: string, slug: string}>>([])
  const [towns, setTowns] = useState<Array<{id: string, name: string, slug: string}>>([])
  
  const [formData, setFormData] = useState<PropertyForm>({
    title: '',
    description: '',
    property_type: '',
    house_type: '',
    bedrooms: 1,
    bathrooms: 1,
    rent_monthly: '',
    ber_rating: '',
    furnished: '',
    county: '',
    town: '',
    address: '',
    available_from: '',
    lease_duration: '12',
    deposit: '',
    contact_method: 'direct',
    features: [],
    images: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customFeature, setCustomFeature] = useState('')

  // Load counties on component mount
  useState(() => {
    const fetchCounties = async () => {
      try {
        const response = await api.get('/counties/')
        setCounties(response.data.results || response.data)
      } catch (error) {
        console.error('Failed to fetch counties:', error)
      }
    }
    fetchCounties()
  })

  // Load towns when county changes
  useState(() => {
    if (formData.county) {
      const fetchTowns = async () => {
        try {
          const response = await api.get(`/towns/?county__slug=${formData.county}`)
          setTowns(response.data.results || response.data)
        } catch (error) {
          console.error('Failed to fetch towns:', error)
        }
      }
      fetchTowns()
    } else {
      setTowns([])
    }
  })

  const handleInputChange = (field: keyof PropertyForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const handleAddCustomFeature = () => {
    if (customFeature.trim() && !formData.features.includes(customFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, customFeature.trim()]
      }))
      setCustomFeature('')
    }
  }

  const handleRemoveFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 10) // Limit to 10 images
    }))
  }

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.property_type) newErrors.property_type = 'Property type is required'
    if (!formData.rent_monthly) newErrors.rent_monthly = 'Monthly rent is required'
    if (!formData.county) newErrors.county = 'County is required'
    if (!formData.town) newErrors.town = 'Town is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.available_from) newErrors.available_from = 'Available from date is required'

    // Validate rent amount
    if (formData.rent_monthly && (isNaN(Number(formData.rent_monthly)) || Number(formData.rent_monthly) <= 0)) {
      newErrors.rent_monthly = 'Please enter a valid rent amount'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Create FormData for file upload
      const submitData = new FormData()
      
      // Add basic fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'features') {
          submitData.append(key, JSON.stringify(value))
        } else if (key === 'images') {
          // Handle images separately
          value.forEach((file: File) => {
            submitData.append('images', file)
          })
        } else {
          submitData.append(key, String(value))
        }
      })

      const response = await api.post('/properties/', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Redirect to property detail page
      router.push(`/property/${response.data.id}`)
    } catch (error: any) {
      console.error('Failed to create property:', error)
      if (error.response?.data) {
        const serverErrors: Record<string, string> = {}
        Object.entries(error.response.data).forEach(([key, value]: [string, any]) => {
          if (Array.isArray(value)) {
            serverErrors[key] = value[0]
          } else {
            serverErrors[key] = String(value)
          }
        })
        setErrors(serverErrors)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <LandlordOrAgentRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/properties/manage"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Property Management
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-gray-600 mt-2">List your property for rent on My Gaff List</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <Home className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Modern 2-Bedroom Apartment in Dublin City Center"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => handleInputChange('property_type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.property_type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select property type</option>
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {errors.property_type && <p className="text-red-500 text-sm mt-1">{errors.property_type}</p>}
                </div>

                {formData.property_type === 'house' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House Type
                    </label>
                    <select
                      value={formData.house_type}
                      onChange={(e) => handleInputChange('house_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select house type</option>
                      {HOUSE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <select
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>
                        {num === 0 ? 'Studio' : `${num} bedroom${num > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <select
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>
                        {num} bathroom{num > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your property, its features, and what makes it special..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Location</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    County *
                  </label>
                  <select
                    value={formData.county}
                    onChange={(e) => handleInputChange('county', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.county ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select county</option>
                    {counties.map(county => (
                      <option key={county.slug} value={county.slug}>{county.name}</option>
                    ))}
                  </select>
                  {errors.county && <p className="text-red-500 text-sm mt-1">{errors.county}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Town *
                  </label>
                  <select
                    value={formData.town}
                    onChange={(e) => handleInputChange('town', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.town ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!formData.county}
                  >
                    <option value="">Select town</option>
                    {towns.map(town => (
                      <option key={town.slug} value={town.slug}>{town.name}</option>
                    ))}
                  </select>
                  {errors.town && <p className="text-red-500 text-sm mt-1">{errors.town}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Full address (will be shown approximately for privacy)"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Rent & Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Rent & Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent (€) *
                  </label>
                  <input
                    type="number"
                    value={formData.rent_monthly}
                    onChange={(e) => handleInputChange('rent_monthly', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.rent_monthly ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 1500"
                  />
                  {errors.rent_monthly && <p className="text-red-500 text-sm mt-1">{errors.rent_monthly}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deposit Required (€)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => handleInputChange('deposit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BER Rating
                  </label>
                  <select
                    value={formData.ber_rating}
                    onChange={(e) => handleInputChange('ber_rating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select BER rating</option>
                    {BER_RATINGS.map(rating => (
                      <option key={rating.value} value={rating.value}>{rating.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Furnished
                  </label>
                  <select
                    value={formData.furnished}
                    onChange={(e) => handleInputChange('furnished', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select furnishing</option>
                    {FURNISHED_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available From *
                  </label>
                  <input
                    type="date"
                    value={formData.available_from}
                    onChange={(e) => handleInputChange('available_from', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.available_from ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.available_from && <p className="text-red-500 text-sm mt-1">{errors.available_from}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Duration (months)
                  </label>
                  <select
                    value={formData.lease_duration}
                    onChange={(e) => handleInputChange('lease_duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Method
                  </label>
                  <select
                    value={formData.contact_method}
                    onChange={(e) => handleInputChange('contact_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {CONTACT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Features</h2>
              
              {/* Selected Features */}
              {formData.features.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Features:</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map(feature => (
                      <span
                        key={feature}
                        className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(feature)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Selection */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {COMMON_FEATURES.map(feature => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => handleFeatureToggle(feature)}
                    className={`text-left px-3 py-2 rounded-md border transition-colors ${
                      formData.features.includes(feature)
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {feature}
                  </button>
                ))}
              </div>

              {/* Custom Feature */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  placeholder="Add custom feature"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomFeature())}
                />
                <button
                  type="button"
                  onClick={handleAddCustomFeature}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <ImageIcon className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Property Images</h2>
              </div>

              <div className="mb-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 focus:ring-2 focus:ring-green-500"
                >
                  <Plus className="w-4 h-4" />
                  Add Images
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Upload up to 10 images. First image will be the main image.
                </p>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Link
                href="/properties/manage"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-green-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Property...' : 'Create Property'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </LandlordOrAgentRoute>
  )
}