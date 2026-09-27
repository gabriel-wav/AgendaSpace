import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Like, LikeDocument } from './schemas/like.schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,

    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,

    @InjectModel(Like.name)
    private readonly likeModel: Model<LikeDocument>,

    // PrismaService injetado para consultar e cruzar dados com o MySQL
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cria uma publicação no MongoDB vinculada ao spaceId (MySQL) e authorId (MySQL).
   */
  async createPost(authorId: string, dto: CreatePostDto) {
    const space = await this.prisma.space.findUnique({
      where: { id: dto.spaceId },
      select: { id: true, isActive: true },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com ID "${dto.spaceId}" não encontrado.`);
    }

    if (!space.isActive) {
      throw new BadRequestException('Não é possível criar publicações para um espaço desativado.');
    }

    return this.postModel.create({
      spaceId: dto.spaceId,
      authorId,
      imageUrl: dto.imageUrl,
      content: dto.content,
    });
  }

  /**
   * Retorna todas as publicações de um espaço com agregação de alta performance no MongoDB:
   * - Total de curtidas (likesCount)
   * - Os últimos 3 comentários ordenados do mais recente para o mais antigo (recentComments)
   */
  async getPostsBySpace(spaceId: string) {
    return this.postModel.aggregate([
      {
        $match: { spaceId },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'postId',
          as: 'likes',
        },
      },
      {
        $lookup: {
          from: 'comments',
          let: { currentPostId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$postId', '$$currentPostId'] },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $limit: 3,
            },
          ],
          as: 'recentComments',
        },
      },
      {
        $project: {
          _id: 1,
          spaceId: 1,
          authorId: 1,
          imageUrl: 1,
          content: 1,
          createdAt: 1,
          updatedAt: 1,
          likesCount: { $size: '$likes' },
          recentComments: 1,
        },
      },
    ]);
  }

  /**
   * Adiciona ou remove curtida (Toggle Like).
   */
  async toggleLike(postId: string, authorId: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('ID de publicação inválido.');
    }

    const postObjectId = new Types.ObjectId(postId);

    const post = await this.postModel.findById(postObjectId);
    if (!post) {
      throw new NotFoundException('Publicação não encontrada.');
    }

    const existingLike = await this.likeModel.findOne({
      postId: postObjectId,
      authorId,
    });

    if (existingLike) {
      await this.likeModel.deleteOne({ _id: existingLike._id });
      const totalLikes = await this.likeModel.countDocuments({ postId: postObjectId });
      return {
        liked: false,
        totalLikes,
        message: 'Curtida removida com sucesso.',
      };
    } else {
      await this.likeModel.create({
        postId: postObjectId,
        authorId,
      });
      const totalLikes = await this.likeModel.countDocuments({ postId: postObjectId });
      return {
        liked: true,
        totalLikes,
        message: 'Publicação curtida com sucesso.',
      };
    }
  }

  /**
   * Adiciona um novo comentário a uma publicação.
   */
  async addComment(postId: string, authorId: string, dto: CreateCommentDto) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('ID de publicação inválido.');
    }

    const postObjectId = new Types.ObjectId(postId);

    const post = await this.postModel.findById(postObjectId);
    if (!post) {
      throw new NotFoundException('Publicação não encontrada.');
    }

    return this.commentModel.create({
      postId: postObjectId,
      authorId,
      content: dto.content,
    });
  }

  /**
   * Exclusão moderada de Postagem (Multi-database check: MongoDB + MySQL)
   * Regras de autorização:
   * 1. Administrador global (role === 'ADMIN').
   * 2. Autor do post (post.authorId === user.id).
   * 3. Dono do espaço onde o post foi publicado (space.createdById === user.id).
   */
  async deletePost(postId: string, user: { id: string; role: string }) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('ID de publicação inválido.');
    }

    const postObjectId = new Types.ObjectId(postId);

    // 1. Busca o post no MongoDB para obter spaceId e authorId
    const post = await this.postModel.findById(postObjectId);
    if (!post) {
      throw new NotFoundException('Publicação não encontrada.');
    }

    // 2. Consulta o proprietário (created_by) do espaço no MySQL através do Prisma
    const space = await this.prisma.space.findUnique({
      where: { id: post.spaceId },
      select: { createdById: true },
    });

    // 3. Validação das regras de moderação
    const isAdmin = user.role === 'ADMIN';
    const isAuthor = post.authorId === user.id;
    const isSpaceOwner = space?.createdById === user.id;

    if (!isAdmin && !isAuthor && !isSpaceOwner) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir esta publicação. Apenas o autor, o administrador ou o locatário/dono do espaço podem realizar esta ação.',
      );
    }

    // 4. Exclusão em cascata dos comentários e likes vinculados no MongoDB
    await Promise.all([
      this.postModel.deleteOne({ _id: postObjectId }),
      this.commentModel.deleteMany({ postId: postObjectId }),
      this.likeModel.deleteMany({ postId: postObjectId }),
    ]);

    return {
      message: 'Publicação e seus dados associados excluídos com sucesso.',
      postId,
    };
  }

  /**
   * Exclusão moderada de Comentário (Multi-database check: MongoDB + MySQL)
   * Regras de autorização:
   * 1. Administrador global (role === 'ADMIN').
   * 2. Autor do comentário (comment.authorId === user.id).
   * 3. Dono do espaço correspondente ao post do comentário (space.createdById === user.id).
   */
  async deleteComment(commentId: string, user: { id: string; role: string }) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('ID de comentário inválido.');
    }

    const commentObjectId = new Types.ObjectId(commentId);

    // 1. Busca o comentário no MongoDB
    const comment = await this.commentModel.findById(commentObjectId);
    if (!comment) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    // 2. Busca o post pai no MongoDB para descobrir o spaceId
    const post = await this.postModel.findById(comment.postId);

    let isSpaceOwner = false;
    if (post) {
      // 3. Consulta o proprietário do espaço no MySQL via Prisma
      const space = await this.prisma.space.findUnique({
        where: { id: post.spaceId },
        select: { createdById: true },
      });
      isSpaceOwner = space?.createdById === user.id;
    }

    // 4. Validação das regras de moderação
    const isAdmin = user.role === 'ADMIN';
    const isAuthor = comment.authorId === user.id;

    if (!isAdmin && !isAuthor && !isSpaceOwner) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este comentário. Apenas o autor, o administrador ou o locatário/dono do espaço podem realizar esta ação.',
      );
    }

    // 5. Exclui o comentário no MongoDB
    await this.commentModel.deleteOne({ _id: commentObjectId });

    return {
      message: 'Comentário excluído com sucesso.',
      commentId,
    };
  }
}
