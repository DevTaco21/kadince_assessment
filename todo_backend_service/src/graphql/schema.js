import { buildSchema } from "graphql";
import Todo from "../models/Todo.js";

export const schema = buildSchema(`
  type Todo {
    id: ID!
    title: String!
    description: String
    completed: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input TodoInput {
    title: String!
    description: String
    completed: Boolean
  }

  input TodoUpdateInput {
    title: String
    description: String
    completed: Boolean
  }

  type Query {
    todos(completed: Boolean): [Todo!]!
    todo(id: ID!): Todo
  }

  type Mutation {
    createTodo(input: TodoInput!): Todo!
    updateTodo(id: ID!, input: TodoUpdateInput!): Todo!
    deleteTodo(id: ID!): Boolean!
  }
`);

export const root = {
  todos: async ({ completed }) => {
    const where = typeof completed === "boolean" ? { completed } : undefined;
    const records = await Todo.findAll({ where, order: [["id", "ASC"]] });
    return records.map((r) => r.toJSON());
  },
  todo: async ({ id }) => {
    const record = await Todo.findByPk(id);
    return record ? record.toJSON() : null;
  },
  createTodo: async ({ input }) => {
    const record = await Todo.create({
      title: input.title,
      description: input.description ?? null,
      completed: input.completed ?? false,
    });
    return record.toJSON();
  },
  updateTodo: async ({ id, input }) => {
    const record = await Todo.findByPk(id);
    if (!record) throw new Error("Todo not found");
    await record.update({
      title: input.title ?? record.title,
      description: input.description ?? record.description,
      completed:
        typeof input.completed === "boolean"
          ? input.completed
          : record.completed,
    });
    return record.toJSON();
  },
  deleteTodo: async ({ id }) => {
    const count = await Todo.destroy({ where: { id } });
    return count > 0;
  },
};
