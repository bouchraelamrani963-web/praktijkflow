import { expect, it } from "vitest";
import { can } from "./permissions";

it("reserves practice settings, member management and catalog changes for the owner", () => {
  for (const permission of ["practiceSettings", "manageMembers", "manageCatalog"] as const) {
    expect(can("OWNER", permission)).toBe(true);
    for (const role of ["ADMIN", "PRACTITIONER", "ASSISTANT", null] as const) {
      expect(can(role, permission)).toBe(false);
    }
  }
});

it("allows managers to administer records and perform bulk operations", () => {
  for (const permission of ["deleteRecords", "batchOperations", "practiceAudit", "demoData"] as const) {
    expect(can("OWNER", permission)).toBe(true);
    expect(can("ADMIN", permission)).toBe(true);
    expect(can("PRACTITIONER", permission)).toBe(false);
    expect(can("ASSISTANT", permission)).toBe(false);
  }
});
