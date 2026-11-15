import mongoose from 'mongoose';
import dns from 'dns';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (e) {
      // Ignore if setServers fails
    }
  }

  const connectOptions = {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const conn = await mongoose.connect(uri, connectOptions);
      console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      lastError = error;
      console.warn(`[MongoDB] Connection attempt ${attempt} failed: ${error.message}. Retrying...`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  console.error(`[MongoDB] Final connection failure: ${lastError.message}`);
  throw lastError;
}
