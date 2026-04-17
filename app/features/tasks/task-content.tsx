import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  CheckSquare,
  ClipboardList,
  Lightbulb,
  TestTube2,
  Timer,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useLoaderData } from "react-router";
import type { loader } from "~/routes/task-new";

export function TaskContent() {
  const { task } = useLoaderData<typeof loader>();

  if (!task || !task.title) {
    return null;
  }

  return (
    <section>
      <ScrollArea className="h-150 pb-4">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Timer className="h-5 w-5" />
              <CardTitle>Título</CardTitle>
            </CardHeader>
            <CardContent>{task.title}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Timer className="h-5 w-5" />
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>{task.description}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Timer className="h-5 w-5" />
              <CardTitle>Tempo estimado</CardTitle>
            </CardHeader>
            <CardContent>{task.estimated_time}</CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <CardTitle>Etapas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2">
                {task.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <TestTube2 className="h-5 w-5" />
              <CardTitle>Testes sugeridos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2">
                {task.suggested_tests.map((test, index) => (
                  <li key={index}>{test}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              <CardTitle>Critérios de aceitação</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2">
                {task.acceptance_criteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              <CardTitle>Sugestão de implementação</CardTitle>
            </CardHeader>
            <CardContent>{task.implementation_suggestion}</CardContent>
          </Card>
        </div>
      </ScrollArea>
      <div className="flex justify-end">
        <Button>Salvar Task</Button>
      </div>
    </section>
  );
}
