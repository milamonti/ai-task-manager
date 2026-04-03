import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/main.tsx", [
    index("routes/dashboard.tsx"),
    route("/tasks", "routes/tasks.tsx"),
    route("/tasks/new", "routes/task-new.tsx"),
    route("/tasks/edit/:id", "routes/task-edit.tsx"),
    route("/users", "routes/users.tsx"),
  ]),
] satisfies RouteConfig;
