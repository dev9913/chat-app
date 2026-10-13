import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  getDeterministicConversationId(userAId: string, userBId: string) {
    return [userAId, userBId].sort().join('_');
  }

  async getOrCreateConversation(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot message yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User does not exist');

    const conversationId = this.getDeterministicConversationId(currentUserId, targetUserId);

    return this.prisma.$transaction(async (tx) => {
      let conv = await tx.conversation.findUnique({
        where: { id: conversationId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true },
              },
            },
          },
        },
      });

      if (!conv) {
        conv = await tx.conversation.create({
          data: {
            id: conversationId,
            members: {
              create: [
                { userId: currentUserId },
                { userId: targetUserId },
              ],
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, photoUrl: true, isOnline: true, lastSeen: true },
                },
              },
            },
          },
        });
      }

      return conv;
    });
  }

  async getUserConversations(userId: string) {
    // Find all memberships for this user
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, clearedAt: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    const memberMap = new Map(memberships.map((m) => [m.conversationId, m.clearedAt]));

    const conversations = await this.prisma.conversation.findMany({
      where: {
        id: { in: conversationIds },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                photoUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            senderId: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filter out conversations that were cleared AND have no new messages since clearedAt
    const activeConversations = conversations.filter((conv) => {
      const clearedAt = memberMap.get(conv.id);
      if (!clearedAt) return true; // Never deleted/cleared
      if (!conv.lastMessageAt) return false;
      return new Date(conv.lastMessageAt) > new Date(clearedAt);
    });

    const results = await Promise.all(
      activeConversations.map(async (conv) => {
        const clearedAt = memberMap.get(conv.id);
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            status: { not: 'READ' },
            deletedAt: null,
            ...(clearedAt ? { createdAt: { gt: clearedAt } } : {}),
          },
        });

        const latestMsg = conv.messages[0];
        return {
          id: conv.id,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          lastMessageSenderId: latestMsg?.senderId || null,
          lastMessageStatus: latestMsg?.status || null,
          unreadCount,
          members: conv.members,
        };
      }),
    );

    return results;
  }

  // "Delete For Me": Only clears chat history for the user requesting it!
  async deleteConversation(conversationId: string, userId: string) {
    await this.verifyMembership(conversationId, userId);

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        clearedAt: new Date(),
      },
    });

    return { success: true };
  }

  async verifyMembership(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not authorized for this conversation');
    return member;
  }
}
