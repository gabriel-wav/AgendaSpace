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
import { Report, ReportDocument } from './schemas/report.schema';
import { HiddenPost, HiddenPostDocument } from './schemas/hidden-post.schema';
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

    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,

    @InjectModel(HiddenPost.name)
    private readonly hiddenPostModel: Model<HiddenPostDocument>,

    // PrismaService injetado para consultar e cruzar dados com o MySQL
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cria uma publicação no MongoDB vinculada ao spaceId (MySQL) e authorId (MySQL).
   */
  async createPost(authorId: string, dto: CreatePostDto) {
    const space = await this.prisma.space.findUnique({
      where: { id: dto.spaceId },
      select: { id: true, isActive: true, isDeleted: true },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com ID "${dto.spaceId}" não encontrado.`);
    }

    if (space.isDeleted) {
      throw new BadRequestException('Não é possível criar publicações para um espaço excluído.');
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

  private async enrichPosts(posts: any[], currentUserId?: string) {
    if (!posts || posts.length === 0) return [];

    const spaceIds = [...new Set(posts.map(p => p.spaceId))];
    const authorIds = [...new Set(posts.map(p => p.authorId))];

    // Get comments' authorIds
    posts.forEach(p => {
      if (p.recentComments) {
        p.recentComments.forEach(c => authorIds.push(c.authorId));
      }
    });

    const uniqueAuthorIds = [...new Set(authorIds)];

    const [spaces, users] = await Promise.all([
      this.prisma.space.findMany({
        where: { id: { in: spaceIds } },
        select: { id: true, name: true }
      }),
      this.prisma.user.findMany({
        where: { id: { in: uniqueAuthorIds } },
        select: { id: true, fullName: true, avatarUrl: true }
      })
    ]);

    const spaceMap = new Map(spaces.map(s => [s.id, s]));
    const userMap = new Map(users.map(u => [u.id, u]));

    // Para likedByMe, precisamos buscar no Mongo se o currentUserId curtiu
    let likedPostIds = new Set<string>();
    if (currentUserId) {
      const postIds = posts.map(p => p._id);
      const myLikes = await this.likeModel.find({
        authorId: currentUserId,
        postId: { $in: postIds }
      }).select('postId');
      myLikes.forEach(l => likedPostIds.add(l.postId.toString()));
    }

    // Buscando total de comentários de forma agilizada (agrupando)
    const postIds = posts.map(p => p._id);
    const commentCounts = await this.commentModel.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);
    const commentCountMap = new Map(commentCounts.map(c => [c._id.toString(), c.count]));

    return posts.map(post => {
      const author = userMap.get(post.authorId) || { id: post.authorId, fullName: 'Desconhecido', avatarUrl: null };
      const space = spaceMap.get(post.spaceId) || { id: post.spaceId, name: 'Desconhecido' };
      
      const mappedComments = (post.recentComments || []).map(c => {
        const cAuthor = userMap.get(c.authorId) || { id: c.authorId, fullName: 'Desconhecido', avatarUrl: null };
        return {
          id: c._id.toString(),
          content: c.content,
          createdAt: c.createdAt,
          author: {
            id: cAuthor.id,
            name: cAuthor.fullName,
            avatarUrl: cAuthor.avatarUrl
          }
        };
      });

      return {
        id: post._id.toString(),
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        likesCount: post.likesCount || 0,
        likedByMe: likedPostIds.has(post._id.toString()),
        totalComments: commentCountMap.get(post._id.toString()) || 0,
        author: {
          id: author.id,
          name: author.fullName,
          avatarUrl: author.avatarUrl
        },
        space: {
          id: space.id,
          name: space.name
        },
        recentComments: mappedComments
      };
    });
  }

  /**
   * Retorna todas as publicações de um espaço com agregação de alta performance no MongoDB
   */
  async getPostsBySpace(spaceId: string, limit: number = 10, cursor?: string, currentUserId?: string) {
    const match: any = { spaceId };
    if (cursor) {
      match._id = { $lt: new Types.ObjectId(cursor) };
    }
    if (currentUserId) {
      const hidden = await this.hiddenPostModel.find({ userId: currentUserId }).select('postId');
      const hiddenIds = hidden.map(h => h.postId);
      if (hiddenIds.length > 0) {
        match._id = { ...match._id, $nin: hiddenIds };
      }
    }

    const posts = await this.postModel.aggregate([
      {
        $match: match,
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
              $sort: { createdAt: -1, _id: -1 },
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
      {
        $limit: limit,
      },
    ]);

    return this.enrichPosts(posts, currentUserId);
  }

  /**
   * Retorna o feed global paginado.
   */
  async getGlobalPosts(limit: number = 10, cursor?: string, currentUserId?: string) {
    const match: any = {};
    if (cursor) {
      match._id = { $lt: new Types.ObjectId(cursor) };
    }
    if (currentUserId) {
      const hidden = await this.hiddenPostModel.find({ userId: currentUserId }).select('postId');
      const hiddenIds = hidden.map(h => h.postId);
      if (hiddenIds.length > 0) {
        match._id = { ...match._id, $nin: hiddenIds };
      }
    }

    const posts = await this.postModel.aggregate([
      { $match: match },
      { $sort: { _id: -1 } },
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
            { $match: { $expr: { $eq: ['$postId', '$$currentPostId'] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 3 },
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
          likesCount: { $size: '$likes' },
          recentComments: 1,
        },
      },
      { $limit: limit },
    ]);

    return this.enrichPosts(posts, currentUserId);
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
        'Você não tem permissão para excluir esta publicação. Apenas o autor, o administrador ou o anfitrião/dono do espaço podem realizar esta ação.',
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
        'Você não tem permissão para excluir este comentário. Apenas o autor, o administrador ou o anfitrião/dono do espaço podem realizar esta ação.',
      );
    }

    // 5. Exclui o comentário no MongoDB
    await this.commentModel.deleteOne({ _id: commentObjectId });

    return {
      message: 'Comentário excluído com sucesso.',
      commentId,
    };
  }

  async hidePost(postId: string, userId: string) {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestException('ID inválido');
    await this.hiddenPostModel.updateOne(
      { postId: new Types.ObjectId(postId), userId },
      { $setOnInsert: { postId: new Types.ObjectId(postId), userId } },
      { upsert: true }
    );
    return { success: true };
  }

  async unhidePost(postId: string, userId: string) {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestException('ID inválido');
    await this.hiddenPostModel.deleteOne({ postId: new Types.ObjectId(postId), userId });
    return { success: true };
  }

  async reportPost(postId: string, userId: string, reason: string, description?: string) {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestException('ID inválido');
    
    const existing = await this.reportModel.findOne({
      postId: new Types.ObjectId(postId),
      reporterId: userId,
      status: 'PENDING'
    });

    if (existing) {
      return { success: true };
    }

    await this.reportModel.create({
      postId: new Types.ObjectId(postId),
      reporterId: userId,
      reason,
      description,
      status: 'PENDING'
    });
    
    return { success: true };
  }

  async getPostComments(postId: string, cursor?: string, limit: number = 10) {
    if (!Types.ObjectId.isValid(postId)) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const postObjectId = new Types.ObjectId(postId);
    const post = await this.postModel.findById(postObjectId);
    if (!post) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const match: any = { postId: postObjectId };

    if (cursor && Types.ObjectId.isValid(cursor)) {
      const cursorComment = await this.commentModel.findById(cursor);
      if (cursorComment) {
        match.$or = [
          { createdAt: { $lt: cursorComment.createdAt } },
          { createdAt: cursorComment.createdAt, _id: { $lt: new Types.ObjectId(cursor) } }
        ];
      }
    }

    const comments = await this.commentModel
      .find(match)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = comments.length > limit;
    const itemsToReturn = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1]._id.toString() : null;

    if (itemsToReturn.length === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const authorIds = [...new Set(itemsToReturn.map(c => c.authorId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const items = itemsToReturn.map(c => {
      const author = userMap.get(c.authorId) || { id: c.authorId, fullName: 'Desconhecido', avatarUrl: null };
      return {
        id: c._id.toString(),
        content: c.content,
        createdAt: c.createdAt,
        author: {
          id: author.id,
          name: author.fullName,
          avatarUrl: author.avatarUrl,
        },
      };
    });

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async getReports(user: { id: string; role: string }, limit: number = 10, cursor?: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Acesso restrito');
    
    const match: any = { status: 'PENDING' };
    if (cursor && Types.ObjectId.isValid(cursor)) {
      match._id = { $lt: new Types.ObjectId(cursor) };
    }

    const reports = await this.reportModel.find(match).sort({ _id: -1 }).limit(limit + 1);
    
    const hasMore = reports.length > limit;
    const itemsToReturn = hasMore ? reports.slice(0, limit) : reports;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1]._id.toString() : null;

    if (itemsToReturn.length === 0) return { items: [], nextCursor: null, hasMore: false };

    const reporterIds = [...new Set(itemsToReturn.map(r => r.reporterId))];
    const postIds = [...new Set(itemsToReturn.map(r => r.postId))];

    const users = await this.prisma.user.findMany({
      where: { id: { in: reporterIds } },
      select: { id: true, fullName: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const posts = await this.postModel.find({ _id: { $in: postIds } });
    const postMap = new Map(posts.map(p => [p._id.toString(), p]));

    const items = itemsToReturn.map(r => {
      const reporter = userMap.get(r.reporterId);
      const post = postMap.get(r.postId.toString());
      return {
        id: r._id.toString(),
        postId: r.postId.toString(),
        reporter: reporter ? { id: reporter.id, name: reporter.fullName, email: reporter.email } : null,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
        postPreview: post ? { content: post.content, imageUrl: post.imageUrl } : null,
      };
    });

    return { items, nextCursor, hasMore };
  }

  async resolveReport(reportId: string, user: { id: string; role: string }) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Acesso restrito');
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Denúncia não encontrada');

    try {
      await this.deletePost(report.postId.toString(), user);
    } catch (e) {
      // Ignorar se já foi excluído
    }

    await this.reportModel.updateMany(
      { postId: report.postId, status: 'PENDING' },
      { $set: { status: 'RESOLVED', resolvedBy: user.id, resolvedAt: new Date() } }
    );

    return { success: true };
  }

  async discardReport(reportId: string, user: { id: string; role: string }) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Acesso restrito');
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Denúncia não encontrada');

    report.status = 'DISMISSED';
    report.resolvedBy = user.id;
    report.resolvedAt = new Date();
    await report.save();

    return { success: true };
  }
}
