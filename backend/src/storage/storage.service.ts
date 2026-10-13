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

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; fileName: string; fileSize: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const maxSize = Number(this.configService.get<number>('MAX_FILE_SIZE')) || 26214400; // 25MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 25MB');
    }

    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${userId}-${randomUUID()}-${safeOriginalName}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const cleanBaseUrl = this.backendBaseUrl.replace(/\/$/, '');
    return {
      url: `${cleanBaseUrl}/uploads/${filename}`,
      fileName: file.originalname,
      fileSize: fileSizeFormatted,
    };
  }

  async uploadAvatar(file: Express.Multer.File, userId: string): Promise<string> {
    const res = await this.uploadFile(file, userId);
    return res.url;
  }
}