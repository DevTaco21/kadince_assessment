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

  type PageInfo {
    total: Int!
    limit: Int!
    offset: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type TodoConnection {
    items: [Todo!]!
    pageInfo: PageInfo!
  }

  type Query {
    todos(completed: Boolean): [Todo!]!
    todosPaginated(limit: Int!, offset: Int!, completed: Boolean): TodoConnection!
    totalCount(completed: Boolean): Int!
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
  todosPaginated: async ({ limit, offset, completed }) => {
    const where = typeof completed === "boolean" ? { completed } : undefined;
    const { count, rows } = await Todo.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "ASC"]],
    });
    const hasNextPage = offset + rows.length < count;
    const hasPreviousPage = offset > 0;
    return {
      items: rows.map((r) => r.toJSON()),
      pageInfo: {
        total: count,
        limit,
        offset,
        hasNextPage,
        hasPreviousPage,
      },
    };
  },
  totalCount: async ({ completed }) => {
    const where = typeof completed === "boolean" ? { completed } : undefined;
    const count = await Todo.count({ where });
    return count;
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
