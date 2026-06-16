import mongoose from "mongoose";

async function connect() {
  try {
    console.log(process.env.DB_CONNECTION_STRING);
    const uri = process.env.DB_CONNECTION_STRING;
    
    if (!uri) {
      throw new Error("DB_CONNECTION_STRING não está definida no .env");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✓ Conectado ao MongoDB com sucesso");
    return mongoose.connection;
  } catch (error) {
    console.error("✗ Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}

export default connect;