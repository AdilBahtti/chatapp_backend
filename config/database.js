const mongoose = require("mongoose");
require("dotenv").config();

/*
  Serverless caveat: a Vercel function can be invoked hundreds of times on one
  warm container, and each cold start gets a fresh module registry. Caching the
  connection on `global` survives module re-evaluation, and caching the *promise*
  (not just the connection) stops concurrent invocations from opening several
  sockets to Atlas at once.
*/

let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error("MONGODB_URL is not set");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // Fail fast instead of burning the whole function timeout when Atlas
        // is unreachable (usually a missing IP allow-list entry).
        serverSelectionTimeoutMS: 10000,
        // Lambdas are frozen between requests; a large pool is wasted here.
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((error) => {
        // Drop the rejected promise so the next request retries instead of
        // replaying the same failure forever.
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
