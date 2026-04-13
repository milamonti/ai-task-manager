import type { Role } from "~/generated/prisma/enums";

export type ChatPayloadMessage = {
  id: string;
  content: string;
  role: Role;
};
