import type { Role } from "@/generated/prisma/client";

const permissions = {
  practiceSettings: ["OWNER"],
  manageMembers: ["OWNER"],
  manageCatalog: ["OWNER"],
  practiceAudit: ["OWNER", "ADMIN"],
  demoData: ["OWNER", "ADMIN"],
  batchOperations: ["OWNER", "ADMIN"],
  deleteRecords: ["OWNER", "ADMIN"],
} satisfies Record<string, Role[]>;

export function can(role: Role | null, permission: keyof typeof permissions): boolean {
  return role !== null && permissions[permission].some((allowed) => allowed === role);
}
