import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { StorageModule } from '../storage/storage.module'; // <-- Add this import

@Module({
  imports: [JwtModule.register({}), ConversationsModule, StorageModule], // <-- Add StorageModule here
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
