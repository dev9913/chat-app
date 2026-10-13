import { Controller, Post, Put, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import { MessagesGateway } from '../messages/messages.gateway';

@Controller('friends')
@UseGuards(AuthGuard('jwt'))
export class FriendsController {
  constructor(
    private friendsService: FriendsService,
    private messagesGateway: MessagesGateway,
  ) {}

  @Post('request/:userId')
  async sendRequest(@Req() req: any, @Param('userId') targetUserId: string) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.friendsService.sendRequest(userId, targetUserId);
    this.messagesGateway.server.to(`user_${targetUserId}`).emit('friend_request_received', result);
    return result;
  }

  @Put('request/:id/accept')
  async acceptRequest(@Req() req: any, @Param('id') requestId: string) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.friendsService.acceptRequest(requestId, userId);
    this.messagesGateway.server.to(`user_${result.senderId}`).emit('friend_request_accepted', result);
    return result;
  }

  @Put('request/:id/reject')
  async rejectRequest(@Req() req: any, @Param('id') requestId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.friendsService.rejectRequest(requestId, userId);
  }

  @Get('requests/pending')
  getPending(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.friendsService.getPendingRequests(userId);
  }

  @Get()
  getFriends(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.friendsService.getFriends(userId);
  }

  @Get('status/:userId')
  getStatus(@Req() req: any, @Param('userId') targetUserId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.friendsService.getFriendshipStatus(userId, targetUserId);
  }
  @Delete(":targetUserId")
  async removeFriend(@Req() req: any, @Param("targetUserId") targetUserId: string) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.friendsService.removeFriend(userId, targetUserId);
    if (this.messagesGateway?.server) {
      this.messagesGateway.server.to(`user_${targetUserId}`).emit("friend_removed", { userId });
      this.messagesGateway.server.to(`user_${userId}`).emit("friend_removed", { userId: targetUserId });
    }
    return result;
  }
}
