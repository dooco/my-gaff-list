from rest_framework import serializers
from apps.core.models import Property, County, Town, Landlord


class CountySerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ['id', 'name', 'slug']


class TownSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source='county.name', read_only=True)
    
    class Meta:
        model = Town
        fields = ['id', 'name', 'slug', 'county', 'county_name']


class LandlordSerializer(serializers.ModelSerializer):
    """Serializer for landlord information with conditional contact details"""
    
    class Meta:
        model = Landlord
        fields = [
            'id', 'name', 'display_name', 'user_type', 'company_name',
            'is_verified', 'verification_date', 'preferred_contact_method',
            'response_time_hours', 'phone', 'email'
        ]
    
    def to_representation(self, instance):
        """Override to conditionally include contact details based on verification"""
        data = super().to_representation(instance)
        
        # Only include direct contact details for verified landlords
        if not instance.is_verified:
            data.pop('phone', None)
            data.pop('email', None)
            # Add a flag to indicate contact method
            data['contact_method'] = 'message_only'
        else:
            data['contact_method'] = 'direct'
        
        return data


class PropertySerializer(serializers.ModelSerializer):
    """Main property serializer for list views"""
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.CharField(read_only=True)
    ber_color_class = serializers.CharField(read_only=True)
    landlord = LandlordSerializer(read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'property_type', 'house_type',
            'bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit',
            'furnished', 'ber_rating', 'ber_color_class', 'features',
            'main_image', 'available_from', 'lease_length',
            'county', 'county_name', 'town', 'town_name', 'location_display',
            'landlord', 'created_at', 'updated_at'
        ]


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Detailed property serializer for detail views with full information"""
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.CharField(read_only=True)
    ber_color_class = serializers.CharField(read_only=True)
    landlord = LandlordSerializer(read_only=True)
    county = CountySerializer(read_only=True)
    town = TownSerializer(read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'address', 'property_type', 'house_type',
            'bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit',
            'furnished', 'ber_rating', 'ber_number', 'ber_color_class', 
            'features', 'main_image', 'image_urls', 'available_from', 
            'lease_length', 'county', 'county_name', 'town', 'town_name', 
            'location_display', 'landlord', 'created_at', 'updated_at'
        ]


class PropertyEnquirySerializer(serializers.Serializer):
    """Serializer for property enquiry form submissions"""
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    message = serializers.CharField(max_length=1000)
    property_id = serializers.UUIDField()
    
    def validate_property_id(self, value):
        """Validate that the property exists and is active"""
        try:
            property = Property.objects.get(id=value, is_active=True)
            return value
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found or is no longer available.")