import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ required: true })
  reporterId: string;

  @Prop({ required: true })
  reason: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: ['PENDING', 'RESOLVED', 'DISMISSED'], default: 'PENDING' })
  status: string;
  
  @Prop()
  resolvedBy?: string;
  
  @Prop()
  resolvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ postId: 1, reporterId: 1 }, { unique: true });
