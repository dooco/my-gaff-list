from rest_framework import serializers
from .models import County, Town, Property, Landlord, PropertyImage
from django.contrib.auth import get_user_model

User = get_user_model()


class CountySerializer(serializers.ModelSerializer):
    """Serializer for County model"""
    towns_count = serializers.SerializerMethodField()
    
    class Meta:
        model = County
        fields = ['id', 'name', 'slug', 'towns_count']
    
    def get_towns_count(self, obj):
        return obj.towns.count()


class TownSerializer(serializers.ModelSerializer):
    """Serializer for Town model"""
    county_name = serializers.CharField(source='county.name', read_only=True)
    
    class Meta:
        model = Town
        fields = ['id', 'name', 'slug', 'county', 'county_name']


class LandlordSerializer(serializers.ModelSerializer):
    """Serializer for landlord information with conditional contact details"""
    display_name = serializers.ReadOnlyField()
    
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


class PropertyImageSerializer(serializers.ModelSerializer):
    """Serializer for PropertyImage model"""
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyImage
        fields = ['id', 'url', 'caption', 'is_main', 'order']
    
    def get_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer for property list view with essential fields"""
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.ReadOnlyField()
    ber_color_class = serializers.ReadOnlyField()
    landlord = LandlordSerializer(read_only=True)
    main_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'property_type', 'bedrooms', 'bathrooms',
            'rent_monthly', 'ber_rating', 'ber_color_class', 'furnished',
            'main_image_url', 'location_display', 'county_name', 'town_name',
            'available_from', 'created_at', 'features', 'landlord', 'owner'
        ]
    
    def get_main_image_url(self, obj):
        """Return main image URL as string"""
        if obj.main_image_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.main_image_url)
            return obj.main_image_url
        return None


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Serializer for property detail view with full information"""
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.ReadOnlyField()
    ber_color_class = serializers.ReadOnlyField()
    landlord = LandlordSerializer(read_only=True)
    images = serializers.SerializerMethodField()
    main_image_url = serializers.ReadOnlyField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'property_type', 'house_type',
            'bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit',
            'furnished', 'lease_duration', 'ber_rating', 'ber_number', 'ber_color_class',
            'features', 'main_image_url', 'images', 'available_from', 'contact_method',
            'county_name', 'town_name', 'location_display', 'address',
            'address_line_1', 'address_line_2', 'eircode', 'full_address',
            'created_at', 'updated_at', 'view_count', 'enquiry_count', 'landlord', 'owner'
        ]
    
    def get_images(self, obj):
        """Return images as an array of URL strings"""
        request = self.context.get('request')
        images = obj.images.all().order_by('order', 'created_at')
        
        image_urls = []
        for image in images:
            if image.image:
                if request:
                    image_urls.append(request.build_absolute_uri(image.image.url))
                else:
                    image_urls.append(image.image.url)
        
        return image_urls


class PropertyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating properties"""
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    new_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    deleted_image_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Property
        fields = [
            'title', 'description', 'property_type', 'house_type',
            'bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit',
            'furnished', 'lease_duration', 'ber_rating', 'ber_number',
            'features', 'available_from', 'contact_method',
            'county', 'town', 'address', 'address_line_1', 'address_line_2', 'eircode',
            'images', 'new_images', 'deleted_image_ids'
        ]
    
    def validate_eircode(self, value):
        """Validate Eircode format"""
        from .models import validate_eircode
        if value:
            try:
                validate_eircode(value)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        return value.upper() if value else value
    
    def validate_features(self, value):
        """Validate features field if it's a JSON string"""
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for features")
        return value
    
    def validate_deleted_image_ids(self, value):
        """Validate deleted_image_ids field if it's a JSON string"""
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for deleted_image_ids")
        return value
    
    def create(self, validated_data):
        images = validated_data.pop('images', [])
        new_images = validated_data.pop('new_images', [])
        validated_data.pop('deleted_image_ids', [])  # Not used in create
        
        # Set owner to current user
        validated_data['owner'] = self.context['request'].user
        
        property_instance = Property.objects.create(**validated_data)
        
        # Handle image uploads
        all_images = images + new_images
        for i, image in enumerate(all_images):
            PropertyImage.objects.create(
                property=property_instance,
                image=image,
                is_main=(i == 0),  # First image is main
                order=i
            )
        
        return property_instance
    
    def update(self, instance, validated_data):
        images = validated_data.pop('images', [])
        new_images = validated_data.pop('new_images', [])
        deleted_image_ids = validated_data.pop('deleted_image_ids', [])
        
        # Update property fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle deleted images
        if deleted_image_ids:
            PropertyImage.objects.filter(
                id__in=deleted_image_ids,
                property=instance
            ).delete()
        
        # Handle new images
        all_new_images = images + new_images
        if all_new_images:
            # Get current image count for ordering
            current_count = instance.images.count()
            
            for i, image in enumerate(all_new_images):
                PropertyImage.objects.create(
                    property=instance,
                    image=image,
                    is_main=(current_count == 0 and i == 0),  # First image is main if no existing images
                    order=current_count + i
                )
        
        return instance


class PropertyEnquirySerializer(serializers.Serializer):
    """Serializer for property enquiries (using users app model)"""
    property_id = serializers.CharField(write_only=True)
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    message = serializers.CharField(max_length=1000)
    
    def validate(self, attrs):
        """Validate enquiry data"""
        from apps.users.models import PropertyEnquiry
        from .models import Property
        
        # Validate property exists
        try:
            property_instance = Property.objects.get(id=attrs['property_id'])
            attrs['property'] = property_instance
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found")
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # For authenticated users, use their profile info
            attrs['user'] = request.user
            if not attrs.get('name'):
                attrs['name'] = request.user.get_full_name() or request.user.username
            if not attrs.get('email'):
                attrs['email'] = request.user.email
        else:
            # For anonymous users, require name and email
            if not attrs.get('name'):
                raise serializers.ValidationError("Name is required")
            if not attrs.get('email'):
                raise serializers.ValidationError("Email is required")
        
        return attrs
    
    def create(self, validated_data):
        from apps.users.models import PropertyEnquiry
        
        property_instance = validated_data.pop('property')
        validated_data.pop('property_id')
        
        enquiry = PropertyEnquiry.objects.create(
            property=property_instance,
            **validated_data
        )
        
        # Increment enquiry count on property
        property_instance.increment_enquiry_count()
        return enquiry