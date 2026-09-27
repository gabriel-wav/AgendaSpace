import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: 'O conteúdo deve ser um texto' })
  @IsNotEmpty({ message: 'O comentário não pode ser vazio' })
  content: string;
}
