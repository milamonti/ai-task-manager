import { turso } from "~/turso";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Route } from "./+types/users";

type User = {
  id: number;
  email: string;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: number;
  last_login: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const normalized = value.replace(" ", "T");
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

export async function loader() {
  const response = await turso.execute("SELECT * FROM users");
  const users: User[] = response.rows.map((row) => {
    const record = row as Record<string, unknown>;

    return {
      id: Number(record.id ?? 0),
      email: String(record.email ?? ""),
      name: record.name ? String(record.name) : null,
      created_at: record.created_at ? String(record.created_at) : null,
      updated_at: record.updated_at ? String(record.updated_at) : null,
      is_active: Number(record.is_active ?? 0),
      last_login: record.last_login ? String(record.last_login) : null,
    };
  });

  return {
    users,
  };
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const users = ((loaderData as { users?: User[] } | undefined)?.users ??
    []) as User[];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Lista de usuários cadastrados na aplicação.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Ultimo login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                Nenhum usuario encontrado.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.id}</TableCell>
                <TableCell>{user.name ?? "-"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.is_active ? (
                    <Badge className="bg-green-600 text-white hover:bg-green-600">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(user.created_at)}</TableCell>
                <TableCell>{formatDateTime(user.last_login)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
