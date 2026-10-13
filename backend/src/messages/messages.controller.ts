import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private storageService: StorageService,
  ) {}

  @Get()
  getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      userId,
      cursor,
      take ? parseInt(take, 10) : 40,
    );
  }

  @Post('attachment')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.storageService.uploadAvatar(file, userId);
    return { url };
  }

  @Patch(':messageId')
  editMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body('text') text: string,
  ) {
    return this.messagesService.editMessage(messageId, userId, text);
  }

  @Delete(':messageId')
  deleteMessage(@Param('messageId') messageId: string, @CurrentUser('id') userId: string) {
    return this.messagesService.deleteMessage(messageId, userId);
  }
}
