'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, ShareIcon, HomeIcon } from '@heroicons/react/24/outline';
import { PropertyDetail } from '@/types/property';
import PropertyImageCarousel from '@/components/PropertyImageCarousel';
import PropertyInfoSections from '@/components/PropertyInfoSections';
import PropertyContactPanel from '@/components/PropertyContactPanel';
import SimilarProperties from '@/components/SimilarProperties';
import BERBadge from '@/components/BERBadge';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/properties/${propertyId}/`);
        
        if (!response.ok) {
          throw new Error('Property not found');
        }
        
        const data = await response.json();
        setProperty(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const handleEnquiry = async (enquiryData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) => {
    try {
      const response = await fetch(`http://localhost:8000/api/properties/${propertyId}/enquiry/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryData),
      });

      if (!response.ok) {
        throw new Error('Failed to send enquiry');
      }

      const result = await response.json();
      
      // Show success message (you could use a toast library here)
      alert(`Your enquiry has been sent successfully! Expected response time: ${result.landlord_response_time}`);
    } catch (error) {
      console.error('Enquiry failed:', error);
      alert('Failed to send enquiry. Please try again.');
      throw error;
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = property?.title || 'Property Listing';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this property: ${title}`,
          url,
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The property you are looking for could not be found.'}</p>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getPropertyTypeDisplay = (type: string, houseType?: string) => {
    const typeMap: Record<string, string> = {
      apartment: 'Apartment',
      house: 'House',
      shared: 'Shared',
      studio: 'Studio',
      townhouse: 'Townhouse'
    };

    const houseTypeMap: Record<string, string> = {
      terraced: 'Terraced',
      semi_detached: 'Semi-Detached',
      detached: 'Detached',
      bungalow: 'Bungalow'
    };

    let display = typeMap[type] || type;
    if (houseType && houseTypeMap[houseType]) {
      display = `${houseTypeMap[houseType]} ${display}`;
    }
    return display;
  };

  // Prepare images array for carousel
  const images = property.image_urls && property.image_urls.length > 0 
    ? property.image_urls 
    : property.main_image 
    ? [property.main_image] 
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/?county=${property.county.slug}`} className="text-blue-600 hover:text-blue-800">
              {property.county.name}
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/?county=${property.county.slug}&town=${property.town.slug}`} className="text-blue-600 hover:text-blue-800">
              {property.town.name}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 truncate">{property.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button & Share */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Back to search
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <ShareIcon className="h-5 w-5" />
            Share
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Images and Details */}
          <div className="lg:col-span-2 space-y-6 relative z-10">
            {/* Property Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="text-gray-600 flex items-center gap-2">
                    <span>{property.location_display}</span>
                    {property.ber_rating && (
                      <>
                        <span>•</span>
                        <BERBadge rating={property.ber_rating} />
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(property.rent_monthly)}
                  </div>
                  <div className="text-gray-600">per month</div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                <span className="capitalize">{property.property_type}</span>
                <span className="capitalize">{property.furnished.replace('_', ' ')}</span>
              </div>

              {/* Property Overview Boxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <HomeIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-xs text-gray-600">Type</div>
                    <div className="font-medium text-sm">{getPropertyTypeDisplay(property.property_type, property.house_type)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">🛏️</div>
                  <div>
                    <div className="text-xs text-gray-600">Bedrooms</div>
                    <div className="font-medium text-sm">{property.bedrooms}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">🚿</div>
                  <div>
                    <div className="text-xs text-gray-600">Bathrooms</div>
                    <div className="font-medium text-sm">{property.bathrooms}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">€</div>
                  <div>
                    <div className="text-xs text-gray-600">Monthly</div>
                    <div className="font-medium text-sm">{formatPrice(property.rent_monthly)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Carousel */}
            <div className="relative z-20">
              <PropertyImageCarousel
                images={images}
                propertyTitle={property.title}
              />
            </div>

            {/* Property Information Sections */}
            <div className="relative z-10">
              <PropertyInfoSections property={property} />
            </div>
          </div>

          {/* Right Column - Contact Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <PropertyContactPanel
                property={property}
                onEnquiry={handleEnquiry}
              />
            </div>
          </div>
        </div>

        {/* Similar Properties - Full Width Section */}
        <div className="mt-12">
          <SimilarProperties
            currentProperty={{
              id: property.id,
              property_type: property.property_type,
              bedrooms: property.bedrooms,
              county: property.county,
              town: property.town,
              rent_monthly: property.rent_monthly
            }}
          />
        </div>
      </div>
    </div>
  );
}