"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type TodoFormValues = {
  title: string;
  description?: string;
};

type Props = {
  initialValues?: TodoFormValues;
  submitLabel?: string;
  onSubmit?: (values: TodoFormValues) => void;
};

function TodoFormComponent({ initialValues, submitLabel = "Add", onSubmit }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      onSubmit?.({ title: title.trim(), description: description.trim() || undefined });
      if (!initialValues) {
        setTitle("");
        setDescription("");
      }
    },
    [canSubmit, description, initialValues, onSubmit, title]
  );

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a new todo..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export const TodoForm = memo(TodoFormComponent); 