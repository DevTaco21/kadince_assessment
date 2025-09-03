import { Sequelize } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseDir = path.join(__dirname, "../../data");
const databasePath = path.join(databaseDir, "database.sqlite");

try {
  fs.mkdirSync(databaseDir, { recursive: true });
} catch (_) {}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: databasePath,
  logging: false,
});

export async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    return sequelize;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}
