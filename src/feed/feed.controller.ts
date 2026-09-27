import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Publica uma nova foto/post vinculada a um espaço.
   * Rota protegida: extrai o authorId do usuário logado via JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(
    @CurrentUser('id') authorId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.feedService.createPost(authorId, createPostDto);
  }

  /**
   * Retorna o feed de publicações de um espaço específico.
   * Retorna os posts com likesCount e os últimos 3 comentários.
   */
  @Get('spaces/:spaceId')
  async getPostsBySpace(@Param('spaceId') spaceId: string) {
    return this.feedService.getPostsBySpace(spaceId);
  }

  /**
   * Adiciona ou remove curtida de uma publicação (Toggle Like).
   * Rota protegida: garante 1 curtida por usuário autenticado.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('posts/:postId/like')
  async toggleLike(
    @Param('postId') postId: string,
    @CurrentUser('id') authorId: string,
  ) {
    return this.feedService.toggleLike(postId, authorId);
  }

  /**
   * Adiciona um comentário a uma publicação.
   * Rota protegida: registra o authorId do usuário logado.
   */
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  async addComment(
    @Param('postId') postId: string,
    @CurrentUser('id') authorId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.feedService.addComment(postId, authorId, createCommentDto);
  }

  /**
   * Exclusão moderada de Post.
   * Rota protegida: avalia autor, ADMIN ou dono do espaço.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('posts/:postId')
  async deletePost(
    @Param('postId') postId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.feedService.deletePost(postId, user);
  }

  /**
   * Exclusão moderada de Comentário.
   * Rota protegida: avalia autor, ADMIN ou dono do espaço.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.feedService.deleteComment(commentId, user);
  }
}

