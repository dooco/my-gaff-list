from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from apps.core.models import Landlord, Property, County, Town
from apps.users.models import PropertyEnquiry
from .models import LandlordProfile, PropertyStats

User = get_user_model()


class LandlordRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for landlord registration"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    # Landlord details
    landlord_name = serializers.CharField(max_length=100, write_only=True)
    landlord_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)
    company_name = serializers.CharField(max_length=100, required=False, allow_blank=True, write_only=True)
    user_type_choice = serializers.ChoiceField(
        choices=[('landlord', 'Landlord'), ('agent', 'Estate Agent'), ('property_manager', 'Property Manager')],
        default='landlord',
        write_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'phone_number',
            'password', 'password_confirm', 'landlord_name', 'landlord_phone',
            'company_name', 'user_type_choice'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        # Extract landlord-specific data
        landlord_name = validated_data.pop('landlord_name')
        landlord_phone = validated_data.pop('landlord_phone', '')
        company_name = validated_data.pop('company_name', '')
        user_type_choice = validated_data.pop('user_type_choice', 'landlord')
        password_confirm = validated_data.pop('password_confirm')
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password'],
            user_type=user_type_choice
        )
        
        # Create landlord
        landlord = Landlord.objects.create(
            name=landlord_name,
            email=user.email,
            phone=landlord_phone,
            user_type=user_type_choice,
            company_name=company_name,
            preferred_contact_method='both'
        )
        
        # Create landlord profile linking user to landlord
        LandlordProfile.objects.create(
            user=user,
            landlord=landlord
        )
        
        return user


class LandlordProfileSerializer(serializers.ModelSerializer):
    """Serializer for landlord profile management"""
    
    landlord_name = serializers.CharField(source='landlord.name')
    landlord_email = serializers.EmailField(source='landlord.email', read_only=True)
    landlord_phone = serializers.CharField(source='landlord.phone')
    company_name = serializers.CharField(source='landlord.company_name')
    user_type = serializers.CharField(source='landlord.user_type')
    is_verified = serializers.BooleanField(source='landlord.is_verified', read_only=True)
    response_time_hours = serializers.IntegerField(source='landlord.response_time_hours')
    
    total_properties = serializers.ReadOnlyField()
    total_enquiries = serializers.ReadOnlyField()
    
    class Meta:
        model = LandlordProfile
        fields = [
            'landlord_name', 'landlord_email', 'landlord_phone', 'company_name',
            'user_type', 'is_verified', 'response_time_hours', 'business_license',
            'tax_number', 'auto_reply_enabled', 'auto_reply_message',
            'email_on_enquiry', 'sms_on_enquiry', 'daily_summary',
            'allow_analytics', 'public_profile', 'total_properties', 'total_enquiries'
        ]
    
    def update(self, instance, validated_data):
        # Update landlord data if provided
        landlord_data = {}
        for field in ['name', 'phone', 'company_name', 'user_type', 'response_time_hours']:
            if field in validated_data:
                landlord_data[field] = validated_data.pop(field)
        
        if landlord_data:
            for field, value in landlord_data.items():
                setattr(instance.landlord, field, value)
            instance.landlord.save()
        
        # Update profile data
        return super().update(instance, validated_data)


class PropertyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating properties"""
    
    county_id = serializers.IntegerField(write_only=True)
    town_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'county_id', 'town_id', 'address',
            'property_type', 'house_type', 'bedrooms', 'bathrooms', 'floor_area',
            'rent_monthly', 'deposit', 'furnished', 'lease_duration',
            'ber_rating', 'ber_number', 'features', 'available_from', 'contact_method'
        ]
        read_only_fields = ['id']
    
    def validate_county_id(self, value):
        try:
            County.objects.get(id=value)
        except County.DoesNotExist:
            raise serializers.ValidationError("Invalid county ID")
        return value
    
    def validate_town_id(self, value):
        try:
            Town.objects.get(id=value)
        except Town.DoesNotExist:
            raise serializers.ValidationError("Invalid town ID")
        return value
    
    def create(self, validated_data):
        county_id = validated_data.pop('county_id')
        town_id = validated_data.pop('town_id')
        
        # Extract images from request.FILES if present
        request = self.context.get('request')
        images = request.FILES.getlist('images') if request else []
        
        property_instance = Property.objects.create(
            county_id=county_id,
            town_id=town_id,
            **validated_data
        )
        
        # Create PropertyImage instances for uploaded images
        from apps.core.models import PropertyImage
        for i, image_file in enumerate(images):
            PropertyImage.objects.create(
                property=property_instance,
                image=image_file,
                is_main=(i == 0)  # First image is main
            )
        
        return property_instance


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Serializer for property detail/edit view"""
    
    county = serializers.SerializerMethodField()
    town = serializers.SerializerMethodField()
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.ReadOnlyField()
    main_image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = '__all__'
    
    def get_county(self, obj):
        return {
            'id': obj.county.id,
            'name': obj.county.name,
            'slug': obj.county.slug
        }
    
    def get_town(self, obj):
        return {
            'id': obj.town.id,
            'name': obj.town.name,
            'slug': obj.town.slug
        }
    
    def get_main_image_url(self, obj):
        """Return main image URL as string"""
        if obj.main_image_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.main_image_url)
            return obj.main_image_url
        return None
    
    def get_images(self, obj):
        """Return property images"""
        images = []
        for image in obj.images.all():
            images.append({
                'id': str(image.id),
                'url': self.context['request'].build_absolute_uri(image.image.url) if self.context.get('request') else image.image.url,
                'is_main': image.is_main
            })
        return images


class PropertyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating properties"""
    
    county_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    town_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    images_to_delete = serializers.ListField(
        child=serializers.CharField(), 
        write_only=True, 
        required=False,
        default=list
    )
    features = serializers.JSONField(required=False, default=list)
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'county_id', 'town_id', 'address',
            'property_type', 'house_type', 'bedrooms', 'bathrooms', 'floor_area',
            'rent_monthly', 'deposit', 'furnished', 'lease_duration',
            'ber_rating', 'ber_number', 'features', 'available_from', 'contact_method',
            'images_to_delete'
        ]
        read_only_fields = ['id']
    
    def to_internal_value(self, data):
        """Convert form data strings to appropriate types"""
        print(f"PropertyUpdateSerializer.to_internal_value() called")
        
        # Handle boolean fields that come as strings
        if 'furnished' in data:
            if data['furnished'] in ['true', 'True', '1']:
                data['furnished'] = True
            elif data['furnished'] in ['false', 'False', '0']:
                data['furnished'] = False
        
        # Handle numeric fields
        numeric_fields = ['bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit']
        for field in numeric_fields:
            if field in data and data[field]:
                try:
                    if field in ['bedrooms', 'bathrooms']:
                        data[field] = int(data[field])
                    else:
                        data[field] = float(data[field])
                except (ValueError, TypeError):
                    pass
        
        return super().to_internal_value(data)
    
    def validate_features(self, value):
        """Handle features that come as JSON string from form data"""
        print(f"PropertyUpdateSerializer.validate_features() called with value: {value} (type: {type(value)})")
        
        # Handle empty string case
        if value == '' or value == '[]':
            return []
            
        if isinstance(value, str):
            import json
            try:
                parsed = json.loads(value)
                print(f"Features parsed successfully: {parsed}")
                # Ensure it's a list
                if not isinstance(parsed, list):
                    raise serializers.ValidationError("Features must be a list")
                return parsed
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                raise serializers.ValidationError("Invalid features format")
        
        # If it's already a list, return it
        if isinstance(value, list):
            return value
            
        # Default to empty list
        return []
    
    def validate_images_to_delete(self, value):
        """Handle images_to_delete that comes as JSON string from form data"""
        print(f"PropertyUpdateSerializer.validate_images_to_delete() called with value: {value} (type: {type(value)})")
        
        # Handle empty string case
        if value == '' or value == '[]':
            return []
            
        if isinstance(value, str):
            import json
            try:
                parsed = json.loads(value)
                print(f"Images to delete parsed successfully: {parsed}")
                # Ensure it's a list
                if not isinstance(parsed, list):
                    raise serializers.ValidationError("Images to delete must be a list")
                return parsed
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                raise serializers.ValidationError("Invalid images_to_delete format")
        
        # If it's already a list, return it
        if isinstance(value, list):
            return value
            
        # Default to empty list
        return []
    
    def update(self, instance, validated_data):
        print(f"PropertyUpdateSerializer.update() called with validated_data: {validated_data}")
        
        try:
            # Handle county and town updates
            county_id = validated_data.pop('county_id', None)
            town_id = validated_data.pop('town_id', None)
            images_to_delete = validated_data.pop('images_to_delete', [])
            
            if county_id:
                instance.county_id = county_id
            if town_id:
                instance.town_id = town_id
            
            # Handle image deletions
            if images_to_delete:
                from apps.core.models import PropertyImage
                PropertyImage.objects.filter(
                    id__in=images_to_delete, 
                    property=instance
                ).delete()
            
            # Handle new image uploads
            request = self.context.get('request')
            if request and hasattr(request, 'FILES'):
                images = request.FILES.getlist('images')
                from apps.core.models import PropertyImage
                for i, image_file in enumerate(images):
                    # Set first image as main if no main image exists
                    is_main = not instance.images.filter(is_main=True).exists() and i == 0
                    PropertyImage.objects.create(
                        property=instance,
                        image=image_file,
                        is_main=is_main
                    )
            
            # Update other fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            return instance
        except Exception as e:
            print(f"Error in PropertyUpdateSerializer.update(): {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise


class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer for listing landlord's properties"""
    
    county_name = serializers.CharField(source='county.name', read_only=True)
    town_name = serializers.CharField(source='town.name', read_only=True)
    location_display = serializers.ReadOnlyField()
    main_image_url = serializers.SerializerMethodField()
    
    # Statistics
    total_views = serializers.SerializerMethodField()
    total_enquiries = serializers.SerializerMethodField()
    recent_enquiries = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'property_type', 'bedrooms', 'bathrooms',
            'rent_monthly', 'county_name', 'town_name', 'location_display',
            'main_image_url', 'is_active', 'created_at', 'updated_at',
            'total_views', 'total_enquiries', 'recent_enquiries', 'deleted_at'
        ]
    
    def get_main_image_url(self, obj):
        """Return main image URL as string"""
        if obj.main_image_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.main_image_url)
            return obj.main_image_url
        return None
    
    def get_total_views(self, obj):
        return obj.view_count
    
    def get_total_enquiries(self, obj):
        return obj.enquiry_count
    
    def get_recent_enquiries(self, obj):
        return obj.enquiries.filter(created_at__gte=timezone.now() - timedelta(days=7)).count()


class EnquiryManagementSerializer(serializers.ModelSerializer):
    """Serializer for managing property enquiries"""
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_location = serializers.CharField(source='property.location_display', read_only=True)
    user_name = serializers.SerializerMethodField()
    days_since_enquiry = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyEnquiry
        fields = [
            'id', 'property_title', 'property_location', 'user_name',
            'name', 'email', 'phone', 'message', 'status',
            'landlord_response', 'response_date', 'created_at',
            'days_since_enquiry'
        ]
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return obj.name
    
    def get_days_since_enquiry(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        delta = timezone.now() - obj.created_at
        return delta.days


class LandlordDashboardStatsSerializer(serializers.Serializer):
    """Serializer for landlord dashboard statistics"""
    
    total_properties = serializers.IntegerField()
    active_properties = serializers.IntegerField()
    total_enquiries = serializers.IntegerField()
    pending_enquiries = serializers.IntegerField()
    total_views = serializers.IntegerField()
    this_month_views = serializers.IntegerField()
    average_response_time = serializers.FloatField()
    occupancy_rate = serializers.FloatField()