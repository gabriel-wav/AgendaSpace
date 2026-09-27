import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Post } from './post.schema';

export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: true })
export class Like {
  @Prop({ type: Types.ObjectId, ref: Post.name, required: true })
  postId: Types.ObjectId;

  @Prop({ required: true })
  authorId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Garantir integridade de unicidade: um usuário só pode curtir um post uma única vez
LikeSchema.index({ postId: 1, authorId: 1 }, { unique: true });
