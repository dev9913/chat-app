import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendRequestStatus } from '@prisma/client';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  async sendRequest(senderId: string, targetUserId: string) {
    if (senderId === targetUserId) {
      throw new BadRequestException('Cannot add yourself as a friend');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found');

    const existingReverse = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: targetUserId, receiverId: senderId } },
    });

    if (existingReverse && existingReverse.status === FriendRequestStatus.PENDING) {
      // Auto-accept if they already sent a request
      return this.acceptRequest(existingReverse.id, senderId);
    }

    const existing = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId: targetUserId } },
    });

    if (existing) {
      if (existing.status === FriendRequestStatus.ACCEPTED) {
        throw new BadRequestException('Already friends');
      }
      return this.prisma.friendRequest.update({
        where: { id: existing.id },
        data: { status: FriendRequestStatus.PENDING },
        include: { receiver: true, sender: true },
      });
    }

    return this.prisma.friendRequest.create({
      data: { senderId, receiverId: targetUserId },
      include: { receiver: true, sender: true },
    });
  }

  async acceptRequest(requestId: string, userId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.receiverId !== userId) throw new BadRequestException('Not authorized');

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendRequestStatus.ACCEPTED },
      include: { sender: true, receiver: true },
    });
  }

  async rejectRequest(requestId: string, userId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.receiverId !== userId) throw new BadRequestException('Not authorized');

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendRequestStatus.REJECTED },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: FriendRequestStatus.PENDING },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFriends(userId: string) {
    const accepted = await this.prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true },
        },
      },
    });

    return accepted.map((r) => (r.senderId === userId ? r.receiver : r.sender));
  }

  async getFriendshipStatus(userId: string, targetUserId: string) {
    const req = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (!req) return { status: 'NONE' };
    if (req.status === FriendRequestStatus.ACCEPTED) return { status: 'ACCEPTED', requestId: req.id };
    if (req.status === FriendRequestStatus.PENDING) {
      return {
        status: 'PENDING',
        isSender: req.senderId === userId,
        requestId: req.id,
      };
    }
    return { status: 'NONE' };
  }
  async removeFriend(userId: string, targetUserId: string) {
    // Delete any friend request record between both users regardless of direction
    const deleted = await this.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    return { success: true, count: deleted.count, targetUserId, userId };
  }
}
