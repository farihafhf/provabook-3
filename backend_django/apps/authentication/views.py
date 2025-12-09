"""
Authentication views
"""
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer,
    UserListSerializer,
    RegisterSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
    ProfilePictureSerializer,
    DeleteAccountSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register
    Register a new user
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Format response to match frontend expectations (camelCase)
        user_data = UserSerializer(user).data
        return Response({
            'user': {
                'id': str(user_data['id']),
                'email': user_data['email'],
                'fullName': user_data['full_name'],
                'role': user_data['role'],
                'phone': user_data.get('phone'),
                'department': user_data.get('department'),
                'isActive': user_data['is_active'],
                'metadata': user_data.get('metadata'),
                'createdAt': user_data['created_at'],
                'updatedAt': user_data['updated_at'],
            },
            'accessToken': str(refresh.access_token),
            'refreshToken': str(refresh),
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login
    Login with email and password
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Format response to match frontend expectations (camelCase)
        user_data = UserSerializer(user).data
        return Response({
            'user': {
                'id': str(user_data['id']),
                'email': user_data['email'],
                'fullName': user_data['full_name'],
                'role': user_data['role'],
                'phone': user_data.get('phone'),
                'department': user_data.get('department'),
                'isActive': user_data['is_active'],
                'metadata': user_data.get('metadata'),
                'createdAt': user_data['created_at'],
                'updatedAt': user_data['updated_at'],
            },
            'accessToken': str(refresh.access_token),
            'refreshToken': str(refresh),
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """
    GET /api/v1/auth/profile
    Get current user profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        data = serializer.data
        # Return camelCase for frontend
        return Response({
            'id': str(data['id']),
            'email': data['email'],
            'fullName': data['full_name'],
            'role': data['role'],
            'phone': data.get('phone'),
            'department': data.get('department'),
            'isActive': data['is_active'],
            'metadata': data.get('metadata'),
            'profilePictureUrl': data.get('profile_picture_url'),
            'createdAt': data['created_at'],
            'updatedAt': data['updated_at'],
        }, status=status.HTTP_200_OK)


class ProfileUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/v1/auth/profile
    Update current user profile
    """
    serializer_class = ProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response({
            'user': UserSerializer(instance).data,
            'message': 'Profile updated successfully'
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password
    Change user password
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Change password
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout
    Logout user by blacklisting refresh token
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response({
                    'message': 'Logout successful'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/users
    List all users - All authenticated users can see all users for task assignment
    """
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # All authenticated users can see all users
        # This is needed for task assignment functionality
        return User.objects.filter(is_active=True).order_by('full_name')


class ProfilePictureUploadView(APIView):
    """
    POST /api/v1/auth/profile/picture
    Upload profile picture
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ProfilePictureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        # Delete old profile picture if exists
        if user.profile_picture:
            user.profile_picture.delete(save=False)
        
        # Save new profile picture
        user.profile_picture = serializer.validated_data['profile_picture']
        user.save()
        
        user_serializer = UserSerializer(user)
        data = user_serializer.data
        
        return Response({
            'message': 'Profile picture updated successfully',
            'profilePictureUrl': data.get('profile_picture_url'),
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        """Remove profile picture"""
        user = request.user
        if user.profile_picture:
            user.profile_picture.delete(save=False)
            user.profile_picture = None
            user.save()
        
        return Response({
            'message': 'Profile picture removed successfully',
        }, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    """
    POST /api/v1/auth/delete-account
    Delete user account permanently
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Delete profile picture if exists
        if user.profile_picture:
            user.profile_picture.delete(save=False)
        
        # Delete the user account
        user.delete()
        
        return Response({
            'message': 'Account deleted successfully',
        }, status=status.HTTP_200_OK)
