import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async findAll() {
    return this.userProfileRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const user = await this.userProfileRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userProfileRepository.save(user);
  }

  async deactivate(id: string) {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.userProfileRepository.save(user);
  }

  async activate(id: string) {
    const user = await this.findOne(id);
    user.isActive = true;
    return this.userProfileRepository.save(user);
  }
}
