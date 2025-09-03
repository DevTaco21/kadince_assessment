"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Todo } from "@/app/graphql/generated.graphql";

// Supports ISO strings and numeric epoch strings (seconds or milliseconds)
function formatDateTime(value?: string) {
  if (!value) return "—";
  let date: Date | null = null;
  if (/^\d+$/.test(value)) {
    const asNum = Number(value);
    if (!Number.isFinite(asNum)) return "—";
    const ms = value.length <= 10 ? asNum * 1000 : asNum;
    date = new Date(ms);
  } else {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return "—";
    date = new Date(parsed);
  }
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

type Props = {
  todo: Todo;
  onToggleCompleted?: (id: string, completed: boolean) => void;
  onEdit?: (id: string, values: { title: string; description?: string | null }) => void;
  onDelete?: (id: string) => void;
};

function TodoItemComponent({ todo, onToggleCompleted, onEdit, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");

  const createdAtDisplay = useMemo(() => formatDateTime(todo.createdAt), [todo.createdAt]);
  const updatedAtDisplay = useMemo(() => formatDateTime(todo.updatedAt), [todo.updatedAt]);

  const handleToggle = useCallback(
    (checked: boolean | string) => {
      onToggleCompleted?.(todo.id, Boolean(checked));
    },
    [onToggleCompleted, todo.id]
  );

  const startEdit = useCallback(() => setIsEditing(true), []);
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setTitle(todo.title);
    setDescription(todo.description ?? "");
  }, [todo.description, todo.title]);

  const saveEdit = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onEdit?.(todo.id, { title: trimmedTitle, description: description.trim() || null });
    setIsEditing(false);
  }, [description, onEdit, title, todo.id]);

  const handleDelete = useCallback(() => onDelete?.(todo.id), [onDelete, todo.id]);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-3 py-4 flex-wrap">
        <Checkbox checked={todo.completed} onCheckedChange={handleToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
            ) : (
              <h3 className="font-medium truncate">{todo.title}</h3>
            )}
          </div>
          <div className="mt-1">
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-sm"
              />
            ) : todo.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{todo.description}</p>
            ) : null}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={saveEdit}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={todo.completed ? "success" : "default"}>
            {todo.completed ? "Completed" : "Pending"}
          </Badge>
          {!isEditing ? (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={startEdit} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleDelete} aria-label="Delete" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="w-full pl-7 pt-2">
          <p className="text-xs text-muted-foreground">
            Created {createdAtDisplay} · Updated {updatedAtDisplay}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const TodoItem = memo(TodoItemComponent); 