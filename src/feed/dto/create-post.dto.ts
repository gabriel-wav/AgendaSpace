import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsUUID('all', { message: 'O ID do espaço deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do espaço é obrigatório' })
  spaceId: string;

  @IsString({ message: 'A URL da imagem é obrigatória' })
  @IsNotEmpty({ message: 'A imagem é obrigatória' })
  imageUrl: string;

  @IsString({ message: 'O conteúdo deve ser um texto' })
  @IsNotEmpty({ message: 'O conteúdo do post é obrigatório' })
  content: string;
}
