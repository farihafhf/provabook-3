import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_ANON_KEY') || '',
    );
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user profile from database
    const userProfile = await this.userProfileRepository.findOne({
      where: { id: authData.user.id },
    });

    if (!userProfile) {
      throw new UnauthorizedException('User profile not found');
    }

    if (!userProfile.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate custom JWT token
    const payload = {
      sub: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        role: userProfile.role,
        department: userProfile.department,
        phone: userProfile.phone,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, fullName, role, phone, department } = registerDto;

    // Check if user already exists
    const existingProfile = await this.userProfileRepository.findOne({ where: { email } });
    if (existingProfile) {
      throw new BadRequestException('User already exists');
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role || UserRole.MERCHANDISER,
        },
      },
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || 'Failed to create user');
    }

    // Create user profile in database
    const userProfile = this.userProfileRepository.create({
      id: authData.user.id,
      email,
      fullName,
      role: role || UserRole.MERCHANDISER,
      phone,
      department,
      isActive: true,
    });

    await this.userProfileRepository.save(userProfile);

    // Generate JWT token
    const payload = {
      sub: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        role: userProfile.role,
        department: userProfile.department,
        phone: userProfile.phone,
      },
    };
  }

  async validateUser(userId: string): Promise<UserProfile> {
    const user = await this.userProfileRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async getProfile(userId: string) {
    const userProfile = await this.userProfileRepository.findOne({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new UnauthorizedException('User profile not found');
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      fullName: userProfile.fullName,
      role: userProfile.role,
      department: userProfile.department,
      phone: userProfile.phone,
    };
  }
}
