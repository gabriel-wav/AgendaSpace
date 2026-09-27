import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Post } from './post.schema';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: Post.name, required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  content: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
