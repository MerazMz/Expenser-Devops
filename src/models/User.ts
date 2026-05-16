import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  provider: "google" | "email";
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  displayName: { type: String },
  photoURL: { type: String },
  provider: { type: String, enum: ["google", "email"], required: true },
  resetOTP: { type: String },
  resetOTPExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
