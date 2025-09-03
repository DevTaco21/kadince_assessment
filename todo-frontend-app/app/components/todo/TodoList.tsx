"use client";

import { memo, useMemo } from "react";
import { TodoItem } from "./TodoItem";
import type { Todo } from "@/app/graphql/generated.graphql";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  todos: Todo[];
  loading?: boolean;
  onToggleCompleted?: (id: string, completed: boolean) => void;
  onEdit?: (id: string, values: { title: string; description?: string | null }) => void;
  onDelete?: (id: string) => void;
};

function TodoListComponent({ todos, loading, onToggleCompleted, onEdit, onDelete }: Props) {
  const items = useMemo(() => todos, [todos]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No todos yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((t) => (
        <TodoItem
          key={t.id}
          todo={t}
          onToggleCompleted={onToggleCompleted}
          onEdit={onEdit}
          onDelete={onDelete}
        />)
      )}
    </div>
  );
}

export const TodoList = memo(TodoListComponent); 