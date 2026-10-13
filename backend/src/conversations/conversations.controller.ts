import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  getMyConversations(@CurrentUser('id') userId: string) {
    return this.conversationsService.getUserConversations(userId);
  }

  @Post()
  createOrGet(@CurrentUser('id') userId: string, @Body('targetUserId') targetUserId: string) {
    return this.conversationsService.getOrCreateConversation(userId, targetUserId);
  }

  @Delete(':conversationId')
  deleteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conversationsService.deleteConversation(conversationId, userId);
  }
}
