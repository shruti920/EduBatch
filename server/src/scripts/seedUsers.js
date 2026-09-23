import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import { hashPassword } from "../utils/hash.js";
import connectDB from "../config/db.js";

const demoUsers = [
  {
    name: "Dr. R. K. Verma",
    email: "admin@edubatch.com",
    password: "Admin@123",
    role: "admin",
    phone: "+91 98231 77890",
  },
  {
    name: "Prof. Alok Shrivastava",
    email: "teacher@edubatch.com",
    password: "Teacher@123",
    role: "teacher",
    phone: "+91 94140 88219",
  },
  {
    name: "Aditya Nair",
    email: "student@edubatch.com",
    password: "Student@123",
    role: "student",
    phone: "+91 98450 11204",
  },
];

const seedUsers = async () => {
  try {
    await connectDB();
    console.log("Connected to database for user seeding...");

    for (const userData of demoUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        const hashedPassword = await hashPassword(userData.password);
        await User.create({
          ...userData,
          password: hashedPassword,
        });
        console.log(`Created ${userData.role} demo user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log("User seeding process complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error during user seeding:", error);
    process.exit(1);
  }
};

seedUsers();
