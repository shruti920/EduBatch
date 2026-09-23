import mongoose from "mongoose";
import { comparePassword } from "../utils/hash.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    // Format is validated by Zod at the API boundary; the schema only enforces uniqueness
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "teacher", "student"],
        message: "Role must be admin, teacher, or student",
      },
      default: "student",
      index: true,
    },
    phone: { type: String, trim: true, default: "" },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    // Notices posted after this moment count as unread (null = everything unread)
    noticesSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
