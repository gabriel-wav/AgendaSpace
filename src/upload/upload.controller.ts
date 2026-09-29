import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Buckets permitidos — impede upload em pastas arbitrárias
const ALLOWED_BUCKETS = ['spaces', 'avatars', 'feed'];

// Tipos MIME permitidos para imagens
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/:bucket
   * Recebe um arquivo via multipart/form-data (campo "file").
   * Salva em public/uploads/{bucket}/ e retorna { url: string }.
   *
   * Consumido pelo hook useFileUpload.ts do frontend.
   */
  @Post(':bucket')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  )
  async uploadFile(
    @Param('bucket') bucket: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Valida bucket
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      throw new BadRequestException(
        `Bucket "${bucket}" não é válido. Use: ${ALLOWED_BUCKETS.join(', ')}`,
      );
    }

    // Valida presença do arquivo
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    // Valida tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}. Use: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const url = await this.uploadService.saveFile(file, bucket);

    return { url };
  }
}
