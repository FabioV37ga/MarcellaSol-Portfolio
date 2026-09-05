import mongoose from "mongoose";

async function connect(uri: string) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log("✓ Conectado ao MongoDB com sucesso");
  return mongoose.connection;
}

export default connect;
