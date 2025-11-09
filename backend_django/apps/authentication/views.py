"""
Authentication views
"""
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    LoginSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer
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
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
    List all users (Admin only)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admin can see all users
        # Manager can see merchandisers
        # Merchandisers can only see themselves
        user = self.request.user
        if user.role == 'admin':
            return User.objects.all()
        elif user.role == 'manager':
            return User.objects.filter(role__in=['manager', 'merchandiser'])
        else:
            return User.objects.filter(id=user.id)
