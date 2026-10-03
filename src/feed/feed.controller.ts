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
  Query,
  Optional,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
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
   * Retorna o feed global
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('posts')
  async getGlobalPosts(
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
    @Optional() @CurrentUser('id') userId?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    // O JwtAuthGuard está no escopo da classe, então userId sempre existirá
    return this.feedService.getGlobalPosts(limit, cursor, userId);
  }

  /**
   * Retorna o feed de publicações de um espaço específico.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('spaces/:spaceId')
  async getPostsBySpace(
    @Param('spaceId') spaceId: string,
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
    @Optional() @CurrentUser('id') userId?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.feedService.getPostsBySpace(spaceId, limit, cursor, userId);
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

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/hide')
  async hidePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.feedService.hidePost(postId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/unhide')
  async unhidePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.feedService.unhidePost(postId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/report')
  async reportPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.feedService.reportPost(postId, userId, reason || 'Conteúdo inadequado');
  }

  @Get('posts/:postId/comments')
  async getPostComments(
    @Param('postId') postId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    let limit = limitStr ? parseInt(limitStr, 10) : 10;
    if (limit > 50) limit = 50;
    return this.feedService.getPostComments(postId, cursor, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reports')
  async getReports(
    @CurrentUser() user: { id: string; role: string },
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    let limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.feedService.getReports(user, limit, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reports/:reportId/resolve')
  async resolveReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.feedService.resolveReport(reportId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reports/:reportId/discard')
  async discardReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.feedService.discardReport(reportId, user);
  }
}
