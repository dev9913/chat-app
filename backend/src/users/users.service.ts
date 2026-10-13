import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query?.trim()) return [];
    return this.prisma.user.findMany({
      where: {
        usernameLowercase: { contains: query.toLowerCase().trim() },
        id: { not: currentUserId },
      },
      select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true },
      take: 20,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, displayName: true, photoUrl: true },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const photoUrl = await this.storage.uploadAvatar(file, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
      select: { id: true, photoUrl: true },
    });
  }
}
