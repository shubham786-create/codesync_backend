import mongoose from 'mongoose';
import dns from 'dns';

// Fallback replica set URI for MongoDB Atlas if DNS SRV resolution is blocked or times out
const ATLAS_DIRECT_URI =
  'mongodb://pandeyshubham0475_db_user:%40poda786@ac-t4petn5-shard-00-00.4aoqyos.mongodb.net:27017,ac-t4petn5-shard-00-01.4aoqyos.mongodb.net:27017,ac-t4petn5-shard-00-02.4aoqyos.mongodb.net:27017/codesync?ssl=true&replicaSet=atlas-95ody9-shard-0&authSource=admin&retryWrites=true&w=majority';

export async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

  if (primaryUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (e) {
      // Ignore if setServers fails
    }
  }

  const connectOptions = {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  };

  const urisToTry = [primaryUri];
  if (primaryUri.includes('cluster0.4aoqyos.mongodb.net') && !urisToTry.includes(ATLAS_DIRECT_URI)) {
    urisToTry.push(ATLAS_DIRECT_URI);
  }

  let lastError;
  for (const uri of urisToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const isSrv = uri.startsWith('mongodb+srv://');
        console.log(`[MongoDB] Connecting via ${isSrv ? 'SRV' : 'direct replica set'} (attempt ${attempt})...`);
        const conn = await mongoose.connect(uri, connectOptions);
        console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (error) {
        lastError = error;
        console.warn(`[MongoDB] Connection attempt failed: ${error.message}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  console.error(`[MongoDB] Final connection failure: ${lastError.message}`);
  throw lastError;
}
