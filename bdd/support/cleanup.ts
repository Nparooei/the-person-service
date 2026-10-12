import { clearTable } from "../services/dynamodb";

export async function clearBddTables(personTable: string, eventsTable: string) {
  if (
    ![personTable, eventsTable].every((name) => name.startsWith("person-bdd-"))
  ) {
    throw new Error("Refusing to clean a non-BDD table");
  }
  await Promise.all([clearTable(personTable), clearTable(eventsTable)]);
}
