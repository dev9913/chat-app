import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageStatus, FriendRequestStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
  ) {}

  async getMessages(conversationId: string, userId: string, cursor?: string, take = 50) {
    const member = await this.conversationsService.verifyMembership(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(member.clearedAt ? { createdAt: { gt: member.clearedAt } } : {}),
      },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, photoUrl: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });
    return messages.reverse();
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    text: string,
    imageUrl?: string,
    fileName?: string,
    fileSize?: string,
  ) {
    const parts = conversationId.split('_');
    const targetUserId = parts[0] === senderId ? parts[1] : parts[0];

    // HARD BLOCK: Verify both users are accepted friends
    const friendship = await this.prisma.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { senderId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: senderId },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException('Cannot send message: You are not accepted friends with this user.');
    }

    await this.conversationsService.verifyMembership(conversationId, senderId);

    let preview = text.trim();
    if (imageUrl) {
      if (fileName && !fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        preview = `📄 ${fileName}`;
      } else {
        preview = text ? `📷 ${text}` : '📷 Photo';
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          receiverId: targetUserId,
          text: text ? text.trim() : '',
          imageUrl: imageUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          status: MessageStatus.SENT,
          isEdited: false,
        },
        include: {
          sender: {
            select: { id: true, username: true, displayName: true, photoUrl: true },
          },
          reactions: {
            include: {
              user: { select: { id: true, username: true, displayName: true } },
            },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });

      return message;
    });
  }

  async editMessage(messageId: string, userId: string, newText: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit another user message');

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        text: newText.trim(),
        isEdited: true,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, photoUrl: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    await this.conversationsService.verifyMembership(conversationId, userId);
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        status: { not: MessageStatus.READ },
      },
      data: { status: MessageStatus.READ },
    });
    return true;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Not your message');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  // ONE REACTION PER USER: Tapping same emoji removes it, tapping another emoji replaces it
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existing = await this.prisma.reaction.findFirst({
      where: { messageId, userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed', emoji, messageId, userId };
      } else {
        const updated = await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { emoji },
          include: { user: { select: { id: true, username: true, displayName: true } } },
        });
        return { action: 'replaced', emoji, oldEmoji: existing.emoji, reaction: updated, messageId, userId };
      }
    } else {
      const created = await this.prisma.reaction.create({
        data: { messageId, userId, emoji },
        include: { user: { select: { id: true, username: true, displayName: true } } },
      });
      return { action: 'added', reaction: created, emoji, messageId, userId };
    }
  }
}
