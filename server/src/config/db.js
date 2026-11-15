import mongoose from 'mongoose';
import dns from 'dns';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

  const connectOptions = {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  };

  try {
    const conn = await mongoose.connect(uri, connectOptions);
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If SRV lookup fails due to local Windows DNS restrictions, fallback to public DNS and retry
    if (uri.startsWith('mongodb+srv://') && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))) {
      console.warn('[MongoDB] Local DNS failed to resolve SRV record. Switching to public DNS fallback (8.8.8.8, 1.1.1.1)...');
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        const conn = await mongoose.connect(uri, connectOptions);
        console.log(`[MongoDB] Connected to database via DNS fallback: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (retryError) {
        console.error(`[MongoDB] Retry connection error: ${retryError.message}`);
        throw retryError;
      }
    }

    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
}
