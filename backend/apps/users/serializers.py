from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from .models import User, UserProfile, SavedProperty, PropertyEnquiry, UserActivity


class UserCreateSerializer(BaseUserCreateSerializer):
    """Custom user creation serializer"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name', 
            'user_type', 'phone_number', 'password', 'password_confirm'
        )
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Password fields didn't match.")
        return attrs
    
    def create(self, validated_data):
        # Remove password_confirm from validated_data
        validated_data.pop('password_confirm', None)
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create user profile
        UserProfile.objects.create(user=user)
        
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user_email', 'user_full_name', 'user_type', 'bio', 'date_of_birth',
            'avatar', 'preferred_counties', 'preferred_towns', 'max_budget',
            'min_bedrooms', 'preferred_property_types', 'preferred_furnished',
            'email_notifications', 'sms_notifications', 'new_property_alerts',
            'price_drop_alerts', 'profile_visibility', 'created_at', 'updated_at'
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user information"""
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'user_type', 'phone_number', 'is_email_verified', 'is_phone_verified',
            'profile_completed', 'profile', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_email_verified', 'is_phone_verified', 'created_at', 'updated_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information"""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number']
    
    def update(self, instance, validated_data):
        user = super().update(instance, validated_data)
        
        # Update profile completion status
        if user.first_name and user.last_name and user.phone_number:
            user.profile_completed = True
            user.save()
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New password fields didn't match.")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class SavedPropertySerializer(serializers.ModelSerializer):
    """Serializer for saved properties"""
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_location = serializers.CharField(source='property.location_display', read_only=True)
    property_rent = serializers.CharField(source='property.rent_monthly', read_only=True)
    property_image = serializers.CharField(source='property.main_image', read_only=True)
    property_ber = serializers.CharField(source='property.ber_rating', read_only=True)
    property_bedrooms = serializers.IntegerField(source='property.bedrooms', read_only=True)
    property_available_from = serializers.DateField(source='property.available_from', read_only=True)
    
    class Meta:
        model = SavedProperty
        fields = [
            'id', 'property', 'property_title', 'property_location', 'property_rent',
            'property_image', 'property_ber', 'property_bedrooms', 'property_available_from',
            'saved_at', 'notes'
        ]
        read_only_fields = ['id', 'saved_at']


class PropertyEnquirySerializer(serializers.ModelSerializer):
    """Serializer for property enquiries"""
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_location = serializers.CharField(source='property.location_display', read_only=True)
    landlord_name = serializers.CharField(source='property.landlord.display_name', read_only=True)
    landlord_is_verified = serializers.BooleanField(source='property.landlord.is_verified', read_only=True)
    
    class Meta:
        model = PropertyEnquiry
        fields = [
            'id', 'property', 'property_title', 'property_location',
            'landlord_name', 'landlord_is_verified', 'name', 'email', 'phone',
            'message', 'status', 'landlord_response', 'response_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'property_title', 'property_location', 'landlord_name',
            'landlord_is_verified', 'landlord_response', 'response_date',
            'created_at', 'updated_at'
        ]


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity tracking"""
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'activity_type', 'description', 'metadata', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class LoginSerializer(serializers.Serializer):
    """Custom login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password.')


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for user dashboard statistics"""
    saved_properties_count = serializers.IntegerField()
    enquiries_sent_count = serializers.IntegerField()
    enquiries_replied_count = serializers.IntegerField()
    recent_activities_count = serializers.IntegerField()
    profile_completion_percentage = serializers.IntegerField()
    
    # For landlords/agents
    properties_listed_count = serializers.IntegerField(required=False)
    enquiries_received_count = serializers.IntegerField(required=False)
    properties_views_count = serializers.IntegerField(required=False)