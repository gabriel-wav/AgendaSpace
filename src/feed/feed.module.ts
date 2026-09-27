import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Post, PostSchema } from './schemas/post.schema';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
    ]),
    PrismaModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
