import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  spaceId: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  content: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ spaceId: 1 });
PostSchema.index({ authorId: 1 });
