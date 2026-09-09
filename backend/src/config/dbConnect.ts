import mongoose from "mongoose";
import { detectMongoDbCapabilities, setMongoDbCapabilities } from "./mongodb-capabilities.js";

async function connect(uri: string) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  const capabilities = await detectMongoDbCapabilities(mongoose.connection);
  setMongoDbCapabilities(capabilities);

  console.log("✓ Conectado ao MongoDB com sucesso");
  if (!capabilities.transactions) {
    console.warn("! MongoDB conectado sem suporte detectável a transações; readiness permanecerá indisponível");
  }
  return mongoose.connection;
}

export default connect;
