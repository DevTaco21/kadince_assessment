"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, gql, useApolloClient } from "@apollo/client";
import { TodoForm, TodoFormValues } from "./components/todo/TodoForm";
import { TodoList } from "./components/todo/TodoList";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TodosPaginatedDocument,
  TotalCountDocument,
  CreateTodoDocument,
  UpdateTodoDocument,
  DeleteTodoDocument,
  type Todo,
  type TodosPaginatedQuery,
} from "./graphql/generated.graphql";

const PendingCheckFragment = gql`
  fragment PendingCheck on Todo { id completed }
`;

type Filter = "all" | "pending" | "completed";

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const [limit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);
  const [openTotal, setOpenTotal] = useState<number | null>(null);

  const completedVar = filter === "all" ? undefined : filter === "completed";

  // Paginated list
  const { data, loading } = useQuery(TodosPaginatedDocument, {
    variables: { limit, offset, completed: completedVar },
    fetchPolicy: "cache-and-network",
  });

  // Fetch open total once, then keep locally in state
  const { data: totalData } = useQuery(TotalCountDocument, {
    variables: { completed: false },
    skip: openTotal !== null,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (openTotal === null && (totalData?.totalCount ?? null) !== null && totalData?.totalCount !== undefined) {
      setOpenTotal(totalData.totalCount);
    }
  }, [openTotal, totalData?.totalCount]);

  const items: Todo[] = useMemo(() => data?.todosPaginated.items ?? [], [data?.todosPaginated?.items]);
  const pageInfo = data?.todosPaginated.pageInfo;

  const [createTodo] = useMutation(CreateTodoDocument);
  const [updateTodo] = useMutation(UpdateTodoDocument);
  const [deleteTodo] = useMutation(DeleteTodoDocument);

  const handleAdd = useCallback(
    (values: TodoFormValues) => {
      const now = new Date().toISOString();
      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const matchesFilter = completedVar === undefined ? true : completedVar === false; // new todos start as not completed
      // Apply optimistic open count locally and roll back on error
      setOpenTotal((prev) => (prev == null ? 1 : prev + 1));
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
          // If we're on the first page and the item matches filter, prepend to current items
          if (offset === 0 && matchesFilter) {
            cache.updateQuery<TodosPaginatedQuery>({ query: TodosPaginatedDocument, variables: { limit, offset, completed: completedVar } }, (existing) => {
              if (!existing) {
                return {
                  todosPaginated: {
                    __typename: "TodoConnection",
                    items: [newTodo],
                    pageInfo: { __typename: "PageInfo", total: 1, limit, offset, hasNextPage: false, hasPreviousPage: false },
                  },
                } as TodosPaginatedQuery;
              }
              const currentItems = existing.todosPaginated.items ?? [];
              if (currentItems.some((t) => t.id === newTodo.id)) return existing;
              const nextItems = [newTodo, ...currentItems].slice(0, limit);
              const nextTotal = (existing.todosPaginated.pageInfo.total ?? 0) + 1;
              const hasNextPage = nextTotal > offset + nextItems.length;
              return {
                todosPaginated: {
                  __typename: "TodoConnection",
                  items: nextItems,
                  pageInfo: { __typename: "PageInfo", total: nextTotal, limit, offset, hasNextPage, hasPreviousPage: false },
                },
              } as TodosPaginatedQuery;
            });
          }
        },
        onError: () => setOpenTotal((prev) => Math.max(0, (prev ?? 1) - 1)),
      });
    },
    [createTodo, completedVar, limit, offset]
  );

  const apolloClient = useApolloClient();
  const handleToggle = useCallback(
    (id: string, completed: boolean) => {
      const now = new Date().toISOString();
      const target = items.find((t) => t.id === id);
      // Determine previous completed state from known list or cache
      let priorCompleted: boolean | undefined = target?.completed;
      const base = target ?? ({ __typename: "Todo", id, title: "", description: null, createdAt: now, updatedAt: now, completed } as Todo);
      updateTodo({
        variables: { id, input: { completed } },
        optimisticResponse: {
          updateTodo: { __typename: "Todo", id, title: base.title, description: base.description, completed, createdAt: base.createdAt, updatedAt: now },
        },
        update: (cache, { data: m }) => {
          const updated = m?.updateTodo;
          if (!updated) return;
          cache.updateQuery<TodosPaginatedQuery>({ query: TodosPaginatedDocument, variables: { limit, offset, completed: completedVar } }, (existing) => {
            if (!existing) return null;
            const current = existing.todosPaginated.items ?? [];
            const wasIncluded = current.some((t) => t.id === updated.id);
            const stillMatches = completedVar === undefined ? true : completedVar === updated.completed;
            let nextItems = current.map((t) => (t.id === updated.id ? updated : t));
            let nextTotal = existing.todosPaginated.pageInfo.total;
            if (wasIncluded && !stillMatches) {
              nextItems = nextItems.filter((t) => t.id !== updated.id);
              nextTotal = Math.max(0, nextTotal - 1);
            } else if (!wasIncluded && stillMatches && offset === 0) {
              nextItems = [updated, ...current].slice(0, limit);
              nextTotal = nextTotal + 1;
            }
            const hasNextPage = nextTotal > offset + nextItems.length;
            const hasPreviousPage = offset > 0;
            return {
              todosPaginated: {
                __typename: "TodoConnection",
                items: nextItems,
                pageInfo: { __typename: "PageInfo", total: nextTotal, limit, offset, hasNextPage, hasPreviousPage },
              },
            } as TodosPaginatedQuery;
          });
        },
        onCompleted: () => {
          if (priorCompleted === undefined) {
            const idRef = apolloClient.cache.identify({ __typename: "Todo", id });
            if (idRef) {
              const frag = apolloClient.cache.readFragment<{ id: string; completed: boolean }>({ id: idRef, fragment: PendingCheckFragment });
              if (frag) priorCompleted = frag.completed;
            }
          }
          if (priorCompleted === undefined || priorCompleted !== completed) {
            const delta = completed ? -1 : +1;
            setOpenTotal((prev) => Math.max(0, (prev ?? 0) + delta));
          }
        },
        onError: () => {
          // Roll back if server rejects: invert the intended delta
          const delta = completed ? -1 : +1;
          setOpenTotal((prev) => Math.max(0, (prev ?? 0) - delta));
        },
      });
    },
    [items, updateTodo, limit, offset, completedVar, apolloClient]
  );

  const handleEdit = useCallback(
    (id: string, values: { title: string; description?: string | null }) => {
    const now = new Date().toISOString();
    const target = items.find((t) => t.id === id);
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
        cache.updateQuery<TodosPaginatedQuery>({ query: TodosPaginatedDocument, variables: { limit, offset, completed: completedVar } }, (existing) => {
          if (!existing) return null;
          const current = existing.todosPaginated.items ?? [];
          const nextItems = current.map((t) => (t.id === updated.id ? updated : t));
          return {
            todosPaginated: {
              __typename: "TodoConnection",
              items: nextItems,
              pageInfo: existing.todosPaginated.pageInfo,
            },
          } as TodosPaginatedQuery;
        });
      },
    });
  }, [items, updateTodo, limit, offset, completedVar]);

  const handleDelete = useCallback(
    (id: string) => {
      // Decide if pending before issuing mutation
      let wasPending: boolean | undefined = undefined;
      const inList = items.find((t) => t.id === id);
      if (inList) wasPending = !inList.completed;
      // Optimistic local open count adjustment
      if (wasPending) setOpenTotal((prev) => Math.max(0, (prev ?? 0) - 1));
      deleteTodo({
        variables: { id },
        optimisticResponse: { deleteTodo: true },
        update: (cache) => {
          cache.updateQuery<TodosPaginatedQuery>({ query: TodosPaginatedDocument, variables: { limit, offset, completed: completedVar } }, (existing) => {
            if (!existing) return null;
            const current = existing.todosPaginated.items ?? [];
            const nextItems = current.filter((t) => t.id !== id);
            const nextTotal = Math.max(0, existing.todosPaginated.pageInfo.total - 1);
            const hasNextPage = nextTotal > offset + nextItems.length;
            const hasPreviousPage = offset > 0;
            return {
              todosPaginated: {
                __typename: "TodoConnection",
                items: nextItems,
                pageInfo: { __typename: "PageInfo", total: nextTotal, limit, offset, hasNextPage, hasPreviousPage },
              },
            } as TodosPaginatedQuery;
          });
        },
        onError: () => {
          // Revert decrement on error
          if (wasPending) setOpenTotal((prev) => (prev ?? 0) + 1);
        },
      });
    },
    [deleteTodo, items, limit, offset, completedVar]
  );

  const canPrev = (pageInfo?.hasPreviousPage ?? offset > 0) && offset > 0;
  const canNext = pageInfo?.hasNextPage ?? false;
  const showingFrom = items.length === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;
  const total = pageInfo?.total ?? items.length;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <Badge variant="secondary">Open: {openTotal ?? 0}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "secondary"} onClick={() => { setFilter("all"); setOffset(0); }}>All</Button>
          <Button variant={filter === "pending" ? "default" : "secondary"} onClick={() => { setFilter("pending"); setOffset(0); }}>Pending</Button>
          <Button variant={filter === "completed" ? "default" : "secondary"} onClick={() => { setFilter("completed"); setOffset(0); }}>Completed</Button>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span>Showing {showingFrom}-{showingTo} of {total}</span>
          <Button variant="secondary" disabled={!canPrev} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
          <Button variant="secondary" disabled={!canNext} onClick={() => setOffset(offset + limit)}>Next</Button>
        </div>
      </div>

      <TodoForm submitLabel="Add todo" onSubmit={handleAdd} />

      <Card>
        <CardContent className="py-4">
          <TodoList todos={items} loading={loading} onToggleCompleted={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
        </CardContent>
      </Card>
    </div>
  );
}
