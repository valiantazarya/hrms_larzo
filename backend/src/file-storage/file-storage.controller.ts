import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from './file-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    const key = await this.fileStorageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const url = await this.fileStorageService.getFileUrl(key);

    return {
      key,
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  @Post('upload-url')
  async getUploadUrl(
    @Body() body: { fileName: string; mimeType: string },
    @CurrentUser() user: any,
  ) {
    const url = await this.fileStorageService.getUploadUrl(
      body.fileName,
      body.mimeType,
    );

    return {
      uploadUrl: url,
      fileName: body.fileName,
      mimeType: body.mimeType,
    };
  }

  @Get(':key')
  async getFileUrl(@Param('key') key: string, @CurrentUser() user: any) {
    const signedUrl = await this.fileStorageService.getSignedUrl(key);
    return { url: signedUrl };
  }

  @Delete(':key')
  async deleteFile(@Param('key') key: string, @CurrentUser() user: any) {
    await this.fileStorageService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }
}

