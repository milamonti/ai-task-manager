import { TasksList } from "~/features/tasks/tasks-list";
import prisma from "../../prisma/prisma";

export async function loader() {
  return {
    tasks: await prisma.task.findMany(),
  };
}

export default function Tasks() {
  return <TasksList />;
}
