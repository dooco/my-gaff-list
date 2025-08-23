"""
Serializers for identity verification
"""

from rest_framework import serializers
from .models import IdentityVerification, User


class VerificationLevelSerializer(serializers.Serializer):
    """Serializer for verification level information"""
    level = serializers.CharField()
    trust_score = serializers.IntegerField()
    requirements = serializers.CharField()
    benefits = serializers.ListField(child=serializers.CharField())


class IdentityVerificationSerializer(serializers.ModelSerializer):
    """Serializer for identity verification records"""
    is_valid = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = IdentityVerification
        fields = [
            'id',
            'verification_type',
            'status',
            'verification_level',
            'provider',
            'document_type',
            'document_country',
            'risk_score',
            'requires_manual_review',
            'failure_reason',
            'created_at',
            'updated_at',
            'verified_at',
            'expires_at',
            'is_valid',
            'is_expired',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'verified_at',
            'is_valid',
            'is_expired',
        ]


class UserVerificationStatusSerializer(serializers.ModelSerializer):
    """Serializer for user verification status"""
    full_name = serializers.ReadOnlyField()
    is_verified = serializers.ReadOnlyField()
    has_full_verification = serializers.ReadOnlyField()
    latest_identity_verification = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'user_type',
            'is_email_verified',
            'is_phone_verified',
            'identity_verified',
            'verification_level',
            'trust_score',
            'is_verified',
            'has_full_verification',
            'latest_identity_verification',
        ]
        read_only_fields = fields
    
    def get_latest_identity_verification(self, obj):
        """Get the latest identity verification attempt"""
        latest = obj.identity_verifications.filter(
            verification_type='full'
        ).first()
        if latest:
            return IdentityVerificationSerializer(latest).data
        return None


class VerificationSessionRequestSerializer(serializers.Serializer):
    """Serializer for creating verification sessions"""
    return_url = serializers.URLField(required=False, allow_blank=True)
    refresh_url = serializers.URLField(required=False, allow_blank=True)


class VerificationSessionResponseSerializer(serializers.Serializer):
    """Serializer for verification session responses"""
    session_id = serializers.CharField()
    client_secret = serializers.CharField()
    status = serializers.CharField()
    verification_id = serializers.IntegerField(required=False)
    existing = serializers.BooleanField(default=False)