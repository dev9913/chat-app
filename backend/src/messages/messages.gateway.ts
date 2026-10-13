import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessageStatus } from '@prisma/client';

interface AuthSocket extends Socket {
  user?: { id: string; username: string };
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: AuthSocket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        this.extractToken(socket.handshake.headers?.cookie);

      if (!token) return socket.disconnect();

      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        process.env.JWT_ACCESS_SECRET ||
        'test_secret_for_e2e_jwt_signing_key_12345';

      const payload = this.jwtService.verify(token, { secret });

      socket.user = { id: payload.sub, username: payload.username };
      socket.join(`user_${payload.sub}`);

      const userSocketsSet = this.userSockets.get(payload.sub) || new Set<string>();
      userSocketsSet.add(socket.id);
      this.userSockets.set(payload.sub, userSocketsSet);

      const currentOnlineUserIds = Array.from(this.userSockets.keys());
      socket.emit('initial_online_users', { userIds: currentOnlineUserIds });

      if (userSocketsSet.size === 1) {
        try {
          await this.prisma.user.update({
            where: { id: payload.sub },
            data: { isOnline: true },
          });
        } catch (_) {}
        this.server.emit('user_online', { userId: payload.sub });

        try {
          const pendingMessages = await this.prisma.message.findMany({
            where: { receiverId: payload.sub, status: MessageStatus.SENT, deletedAt: null },
            select: { id: true, conversationId: true, senderId: true },
          });

          if (pendingMessages.length > 0) {
            await this.prisma.message.updateMany({
              where: { receiverId: payload.sub, status: MessageStatus.SENT, deletedAt: null },
              data: { status: MessageStatus.DELIVERED },
            });

            const notifiedSenders = new Set<string>();
            for (const msg of pendingMessages) {
              this.server.to(msg.conversationId).emit('message_status_update', {
                conversationId: msg.conversationId,
                status: 'DELIVERED',
              });
              if (!notifiedSenders.has(msg.senderId)) {
                notifiedSenders.add(msg.senderId);
                this.server.to(`user_${msg.senderId}`).emit('conversation_delivered_status', {
                  conversationId: msg.conversationId,
                  status: 'DELIVERED',
                });
              }
            }
          }
        } catch (_) {}
      }
    } catch {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: AuthSocket) {
    if (!socket.user) return;
    const userId = socket.user.id;
    const userSocketsSet = this.userSockets.get(userId);

    if (userSocketsSet) {
      userSocketsSet.delete(socket.id);
      if (userSocketsSet.size === 0) {
        this.userSockets.delete(userId);
        const lastSeen = new Date();
        try {
          await this.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen },
          });
        } catch (_) {}
        this.server.emit('user_offline', { userId, lastSeen });
      }
    }
  }

  private extractToken(cookieHeader?: string) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/access_token=([^;]+)/);
    return match ? match[1] : null;
  }

  @SubscribeMessage('join_conversation')
  handleJoin(@ConnectedSocket() socket: AuthSocket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) socket.join(data.conversationId);
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(@ConnectedSocket() socket: AuthSocket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) socket.leave(data.conversationId);
  }

  @SubscribeMessage('send_message')
  async handleSend(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      text?: string;
      imageUrl?: string;
      fileName?: string;
      fileSize?: string;
    },
  ) {
    if (!socket.user) return;
    if (!data.text?.trim() && !data.imageUrl) return;

    try {
      const msg = await this.messagesService.createMessage(
        data.conversationId,
        socket.user.id,
        data.text || "",
        data.imageUrl,
        data.fileName,
        data.fileSize,
      );

      const receiverSockets = this.userSockets.get(msg.receiverId);
      if (receiverSockets && receiverSockets.size > 0) {
        await this.prisma.message.update({
          where: { id: msg.id },
          data: { status: MessageStatus.DELIVERED },
        });
        msg.status = MessageStatus.DELIVERED;
      }

      this.server.to(data.conversationId).emit("new_message", msg);
      this.server.to(`user_${msg.senderId}`).emit("conversation_updated", msg);
      this.server.to(`user_${msg.receiverId}`).emit("conversation_updated", msg);

      return msg;
    } catch (err: any) {
      socket.emit("send_message_error", {
        conversationId: data.conversationId,
        message: err.message || "Failed to send message: Not friends",
      });
      return { error: err.message || "Could not send message" };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDelete(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!socket.user || !data.messageId) return;
    try {
      await this.messagesService.deleteMessage(data.messageId, socket.user.id);

      this.server.to(data.conversationId).emit('message_deleted', {
        conversationId: data.conversationId,
        messageId: data.messageId,
      });

      const latest = await this.prisma.message.findFirst({
        where: { conversationId: data.conversationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      const preview = latest
        ? latest.fileName && !latest.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)
          ? `📄 ${latest.fileName}`
          : latest.imageUrl
          ? latest.text ? `📷 ${latest.text}` : '📷 Photo'
          : latest.text
        : '';

      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessage: preview, lastMessageAt: latest ? latest.createdAt : new Date() },
      });

      this.server.to(data.conversationId).emit('conversation_preview_updated', {
        conversationId: data.conversationId,
        lastMessage: preview,
        lastMessageAt: latest ? latest.createdAt : new Date(),
      });

      return { success: true };
    } catch {
      return { error: 'Could not unsend message' };
    }
  }

  @SubscribeMessage('edit_message')
  async handleEdit(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string; messageId: string; text: string },
  ) {
    if (!socket.user || !data.text?.trim()) return;
    try {
      const updated = await this.messagesService.editMessage(data.messageId, socket.user.id, data.text);
      this.server.to(data.conversationId).emit('message_edited', updated);
      this.server.to(`user_${updated.senderId}`).emit('conversation_updated', updated);
      this.server.to(`user_${updated.receiverId}`).emit('conversation_updated', updated);
      return updated;
    } catch {
      return { error: 'Could not edit message' };
    }
  }

  @SubscribeMessage('toggle_reaction')
  async handleToggleReaction(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string; messageId: string; emoji: string },
  ) {
    if (!socket.user || !data?.messageId || !data?.emoji) return;
    try {
      const result = await this.messagesService.toggleReaction(
        data.messageId,
        socket.user.id,
        data.emoji,
      );

      this.server.to(data.conversationId).emit('reaction_updated', {
        conversationId: data.conversationId,
        ...result,
      });

      return result;
    } catch {
      return { error: 'Could not toggle reaction' };
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.user || !data.conversationId) return;

    socket.to(data.conversationId).emit('typing_start', {
      conversationId: data.conversationId,
      userId: socket.user.id,
    });

    const parts = data.conversationId.split('_');
    const targetUserId = parts[0] === socket.user.id ? parts[1] : parts[0];
    if (targetUserId) {
      this.server.to(`user_${targetUserId}`).emit('typing_start', {
        conversationId: data.conversationId,
        userId: socket.user.id,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.user || !data.conversationId) return;

    socket.to(data.conversationId).emit('typing_stop', {
      conversationId: data.conversationId,
      userId: socket.user.id,
    });

    const parts = data.conversationId.split('_');
    const targetUserId = parts[0] === socket.user.id ? parts[1] : parts[0];
    if (targetUserId) {
      this.server.to(`user_${targetUserId}`).emit('typing_stop', {
        conversationId: data.conversationId,
        userId: socket.user.id,
      });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!socket.user || !data.conversationId) return;
    try {
      const isMember = await this.prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: data.conversationId, userId: socket.user.id } },
      });
      if (!isMember) return;

      await this.messagesService.markMessagesAsRead(data.conversationId, socket.user.id);

      const parts = data.conversationId.split('_');
      const senderUserId = parts[0] === socket.user.id ? parts[1] : parts[0];

      this.server.to(data.conversationId).emit('messages_read', {
        conversationId: data.conversationId,
        readerId: socket.user.id,
      });

      if (senderUserId) {
        this.server.to(`user_${senderUserId}`).emit('conversation_read_status', {
          conversationId: data.conversationId,
          readerId: socket.user.id,
        });
      }

      this.server.emit('conversation_read_status', {
        conversationId: data.conversationId,
        readerId: socket.user.id,
      });
    } catch {}
  }
}
