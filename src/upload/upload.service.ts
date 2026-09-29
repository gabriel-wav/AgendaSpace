import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadsRoot: string;

  constructor() {
    // Resolve a pasta public/uploads relativa à raiz do projeto
    this.uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    this.ensureDirectoryExists(this.uploadsRoot);
  }

  /**
   * Salva o arquivo recebido no bucket (subpasta) especificado.
   * Retorna a URL pública relativa para acesso via ServeStaticModule.
   */
  async saveFile(
    file: Express.Multer.File,
    bucket: string,
  ): Promise<string> {
    const bucketDir = path.join(this.uploadsRoot, bucket);
    this.ensureDirectoryExists(bucketDir);

    // Gera nome único baseado em timestamp + nome original sanitizado
    const timestamp = Date.now();
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const filename = `${timestamp}-${safeName}`;

    const filePath = path.join(bucketDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // Retorna a URL pública que o ServeStaticModule vai servir
    return `/uploads/${bucket}/${filename}`;
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
