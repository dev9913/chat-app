import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private uploadDir: string;
  private backendBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    this.backendBaseUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:4000');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string): Promise<string> {
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('File size must not exceed 25MB');
    }

    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${userId}-${randomUUID()}-${safeOriginalName}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    return `${this.backendBaseUrl}/uploads/${filename}`;
  }
}
