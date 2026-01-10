import { IsEnum, IsString } from 'class-validator';
import { DocumentType } from '../../types/enums';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsString()
  mimeType: string;
}

