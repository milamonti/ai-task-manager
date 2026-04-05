import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Button } from "~/components/ui/button";
import { useLoaderData } from "react-router";
import type { loader } from "~/routes/tasks";

function parseJsonArray(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as string[];
  }
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function truncateText(text: string, maxLength = 80) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

export function TasksList() {
  const { tasks } = useLoaderData<typeof loader>();

  return (
    <div className="rounded-md border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">Título</TableHead>
            <TableHead className="w-88">Descrição</TableHead>
            <TableHead className="w-16">Etapas</TableHead>
            <TableHead className="w-28">Tempo Estimado</TableHead>
            <TableHead className="w-28">Criada em</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma tarefa encontrada.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const stepsCount = parseJsonArray(task.steps).length;

              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    <span
                      className="block max-w-64 truncate"
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="block max-w-88 truncate"
                      title={task.description}
                    >
                      {truncateText(task.description, 110)}
                    </span>
                  </TableCell>
                  <TableCell>{stepsCount}</TableCell>
                  <TableCell>{task.estimated_time || "-"}</TableCell>
                  <TableCell>{formatDate(task.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar tarefa"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
