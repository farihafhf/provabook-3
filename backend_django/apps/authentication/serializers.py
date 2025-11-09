"""
Authentication serializers
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'phone', 'department', 
                  'is_active', 'metadata', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    Accepts both camelCase (from frontend) and snake_case
    """
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, required=False)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'full_name', 'role', 'phone', 'department']
        extra_kwargs = {
            'full_name': {'required': True},
            'email': {'required': True},
        }

    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        # Map camelCase keys to snake_case
        field_mapping = {
            'fullName': 'full_name',
            'passwordConfirm': 'password_confirm',
        }
        
        # Convert camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            # Use mapped key if exists, otherwise use original key
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)

    def validate(self, attrs):
        """
        Validate that passwords match (if password_confirm is provided)
        """
        password_confirm = attrs.get('password_confirm')
        if password_confirm and attrs['password'] != password_confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        """
        Create user with encrypted password
        """
        # Remove password_confirm as it's not needed (if it exists)
        validated_data.pop('password_confirm', None)
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=validated_data.get('role', 'merchandiser'),
            phone=validated_data.get('phone'),
            department=validated_data.get('department'),
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        """
        Validate and authenticate user
        """
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Authenticate user
            user = authenticate(email=email, password=password)

            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include "email" and "password".')


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile
    Accepts both camelCase (from frontend) and snake_case
    """
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'department', 'metadata']

    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'fullName': 'full_name',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)

    def update(self, instance, validated_data):
        """
        Update user profile fields
        """
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.department = validated_data.get('department', instance.department)
        instance.metadata = validated_data.get('metadata', instance.metadata)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing user password
    Accepts both camelCase (from frontend) and snake_case
    """
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, write_only=True, min_length=8, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(required=True, write_only=True, min_length=8, style={'input_type': 'password'})

    def to_internal_value(self, data):
        """Convert camelCase to snake_case"""
        field_mapping = {
            'oldPassword': 'old_password',
            'newPassword': 'new_password',
            'newPasswordConfirm': 'new_password_confirm',
        }
        
        converted_data = {}
        for key, value in data.items():
            new_key = field_mapping.get(key, key)
            converted_data[new_key] = value
        
        return super().to_internal_value(converted_data)

    def validate(self, attrs):
        """
        Validate passwords
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs

    def validate_old_password(self, value):
        """
        Validate old password
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
