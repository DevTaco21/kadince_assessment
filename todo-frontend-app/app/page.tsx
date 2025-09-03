"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { TodoForm, TodoFormValues } from "./components/todo/TodoForm";
import { TodoList } from "./components/todo/TodoList";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TodosDocument,
  CreateTodoDocument,
  UpdateTodoDocument,
  DeleteTodoDocument,
  type TodosQuery,
  type Todo,
} from "./graphql/generated.graphql";

type Filter = "all" | "pending" | "completed";

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const completedVar = filter === "all" ? undefined : filter === "completed";

  const { data, loading } = useQuery(TodosDocument, { variables: { completed: completedVar } });

  const todos: Todo[] = useMemo(() => data?.todos ?? [], [data?.todos]);

  const [createTodo] = useMutation(CreateTodoDocument);
  const [updateTodo] = useMutation(UpdateTodoDocument);
  const [deleteTodo] = useMutation(DeleteTodoDocument);

  const openCount = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);

  const handleAdd = useCallback(
    (values: TodoFormValues) => {
      const now = new Date().toISOString();
      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      createTodo({
        variables: { input: { title: values.title, description: values.description ?? undefined } },
        optimisticResponse: {
          createTodo: {
            __typename: "Todo",
            id: tempId,
            title: values.title,
            description: values.description ?? null,
            completed: false,
            createdAt: now,
            updatedAt: now,
          },
        },
        update: (cache, { data: mutationData }) => {
          const newTodo = mutationData?.createTodo;
          if (!newTodo) return;
          // Update ALL list
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: undefined } }, (existing) => {
            const current = existing?.todos ?? [];
            if (current.some((t) => t.id === newTodo.id)) return { todos: current };
            return { todos: [newTodo, ...current] };
          });
          // Update PENDING list (completed: false)
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: false } }, (existing) => {
            const current = existing?.todos ?? [];
            if (newTodo.completed) return existing ?? { todos: [] };
            if (current.some((t) => t.id === newTodo.id)) return { todos: current };
            return { todos: [newTodo, ...current] };
          });
          // Completed list unaffected
        },
      });
    },
    [createTodo]
  );

  const handleToggle = useCallback(
    (id: string, completed: boolean) => {
      const now = new Date().toISOString();
      // We may not have the item in current filtered data; update with minimal fields
      const target = todos.find((t) => t.id === id);
      const fallback = { __typename: "Todo" as const, id, title: "", description: null, createdAt: now } as Todo;
      const base = target ?? (fallback as Todo);
      updateTodo({
        variables: { id, input: { completed } },
        optimisticResponse: {
          updateTodo: {
            __typename: "Todo",
            id,
            title: base.title,
            description: base.description,
            completed,
            createdAt: base.createdAt,
            updatedAt: now,
          },
        },
        update: (cache, { data: m }) => {
          const updated = m?.updateTodo;
          if (!updated) return;
          const applyMap = (arr: TodosQuery["todos"]) => arr.map((t) => (t.id === updated.id ? updated : t));
          const ensureIn = (arr: TodosQuery["todos"]) => (arr.some((t) => t.id === updated.id) ? applyMap(arr) : [updated, ...arr]);
          const removeFrom = (arr: TodosQuery["todos"]) => arr.filter((t) => t.id !== updated.id);

          // ALL list: just map to updated
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: undefined } }, (existing) => {
            const current = existing?.todos ?? [];
            return { todos: applyMap(current) };
          });
          // PENDING list
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: false } }, (existing) => {
            const current = existing?.todos ?? [];
            return updated.completed ? { todos: removeFrom(current) } : { todos: ensureIn(current) };
          });
          // COMPLETED list
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: true } }, (existing) => {
            const current = existing?.todos ?? [];
            return updated.completed ? { todos: ensureIn(current) } : { todos: removeFrom(current) };
          });
        },
      });
    },
    [todos, updateTodo]
  );

  const handleEdit = useCallback(
    (id: string, values: { title: string; description?: string | null }) => {
      const now = new Date().toISOString();
      const target = todos.find((t) => t.id === id);
      updateTodo({
        variables: { id, input: { title: values.title, description: values.description ?? undefined } },
        optimisticResponse: {
          updateTodo: {
            __typename: "Todo",
            id,
            title: values.title,
            description: values.description ?? null,
            completed: target?.completed ?? false,
            createdAt: target?.createdAt ?? now,
            updatedAt: now,
          },
        },
        update: (cache, { data: m }) => {
          const updated = m?.updateTodo;
          if (!updated) return;
          const applyMap = (arr: TodosQuery["todos"]) => arr.map((t) => (t.id === updated.id ? updated : t));
          // Update all three lists
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: undefined } }, (existing) => ({ todos: applyMap(existing?.todos ?? []) }));
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: false } }, (existing) => ({ todos: applyMap(existing?.todos ?? []) }));
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: true } }, (existing) => ({ todos: applyMap(existing?.todos ?? []) }));
        },
      });
    },
    [todos, updateTodo]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTodo({
        variables: { id },
        optimisticResponse: { deleteTodo: true },
        update: (cache) => {
          cache.evict({ id: cache.identify({ __typename: "Todo", id }) });
          cache.gc();
          const removeFrom = (arr: TodosQuery["todos"]) => arr.filter((t) => t.id !== id);
          // Remove from all three lists
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: undefined } }, (existing) => ({ todos: removeFrom(existing?.todos ?? []) }));
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: false } }, (existing) => ({ todos: removeFrom(existing?.todos ?? []) }));
          cache.updateQuery<{ todos: TodosQuery["todos"] }>({ query: TodosDocument, variables: { completed: true } }, (existing) => ({ todos: removeFrom(existing?.todos ?? []) }));
        },
      });
    },
    [deleteTodo]
  );

  return (
    <div className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <Badge variant="secondary">Open: {openCount}</Badge>
      </div>

      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>All</Button>
        <Button variant={filter === "pending" ? "default" : "secondary"} onClick={() => setFilter("pending")}>Pending</Button>
        <Button variant={filter === "completed" ? "default" : "secondary"} onClick={() => setFilter("completed")}>Completed</Button>
      </div>

      <TodoForm submitLabel="Add todo" onSubmit={handleAdd} />

      <Card>
        <CardContent className="py-4">
          <TodoList todos={todos} loading={loading} onToggleCompleted={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
        </CardContent>
      </Card>
    </div>
  );
}
