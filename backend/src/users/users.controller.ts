import { Controller, Get, Patch, Post, Query, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('search')
  search(@Query('q') query: string, @CurrentUser('id') userId: string) {
    return this.usersService.searchUsers(query, userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() body: { displayName?: string }) {
    return this.usersService.updateProfile(userId, body);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateAvatar(userId, file);
  }
}
