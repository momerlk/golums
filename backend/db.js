import { MongoClient } from 'mongodb';

let client;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  await client.db('admin').command({ ping: 1 });
  return client.db(process.env.MONGODB_DATABASE || 'golums').collection('players');
}

export async function closeDatabase() {
  await client?.close();
}
