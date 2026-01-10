import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class FileStorageService {
  private s3: AWS.S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      endpoint: `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}`,
      accessKeyId: this.configService.get('MINIO_ACCESS_KEY'),
      secretAccessKey: this.configService.get('MINIO_SECRET_KEY'),
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME') || 'hrms-documents';
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
    } catch (error) {
      if (error.statusCode === 404) {
        await this.s3.createBucket({ Bucket: this.bucketName }).promise();
      } else {
        throw error;
      }
    }
  }

  async uploadFile(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    await this.ensureBucketExists();
    
    const key = `${Date.now()}-${fileName}`;
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
    }).promise();

    return key;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    await this.ensureBucketExists();
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    });
  }

  async getUploadUrl(fileName: string, mimeType: string, expiresIn: number = 3600): Promise<string> {
    await this.ensureBucketExists();
    const key = `${Date.now()}-${fileName}`;
    return this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      Expires: expiresIn,
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucketName,
      Key: key,
    }).promise();
  }

  async getFileUrl(key: string): Promise<string> {
    const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const port = this.configService.get('MINIO_PORT') || '9002';
    return `http://${endpoint}:${port}/${this.bucketName}/${key}`;
  }
}

