import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HiddenPostDocument = HydratedDocument<HiddenPost>;

@Schema({ timestamps: true })
export class HiddenPost {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const HiddenPostSchema = SchemaFactory.createForClass(HiddenPost);
HiddenPostSchema.index({ postId: 1, userId: 1 }, { unique: true });
