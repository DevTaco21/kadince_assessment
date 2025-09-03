import express from "express";
import apiRouter from "./routes/index.js";
import { initializeDatabase } from "./db/index.js";
import { schema, root as rootValue } from "./graphql/schema.js";
import { graphqlHTTP } from "express-graphql";
import cors from "cors";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue,
    graphiql: true,
  })
);

async function start() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`GraphiQL available at http://localhost:${port}/graphql`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
