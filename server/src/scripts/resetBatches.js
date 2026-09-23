import "dotenv/config";
import connectDB from "../config/db.js";
import Batch from "../models/Batch.js";

const reset = async () => {
  await connectDB();
  const batches = await Batch.find({});
  for (const b of batches) {
    b.isArchived = false;
    b.status = b.name.includes("Crash") ? "upcoming" : "active";
    await b.save();
    console.log(`Saved batch "${b.name}" -> status: ${b.status}, isArchived: ${b.isArchived}`);
  }
  const count = await Batch.countDocuments({ isArchived: false });
  console.log(`Total active/non-archived batches now: ${count}`);
  process.exit(0);
};

reset();
