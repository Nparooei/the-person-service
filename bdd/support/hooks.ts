import {
  Before,
  BeforeAll,
  AfterAll,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import { deploymentConfig } from "../../bin/config";
import { createExportStageName } from "../../src/microservices/shared/utils";
import { getStackOutputs } from "../services/cloudFormation";
import { clearBddTables } from "./cleanup";
import { createRunLock } from "./run-lock";
import { PersonWorld } from "./world";

setDefaultTimeout(45000);
let runLock: ReturnType<typeof createRunLock> | undefined;
let apiUrl: string, personTable: string, eventsTable: string;
BeforeAll(async () => {
  const names = deploymentConfig(process.env.BDD_STAGE ?? "dev", true);
  const output = async (stack: string, key: string) => {
    const value = await getStackOutputs(
      stack,
      createExportStageName(names.stackStage, key),
    );
    if (!value)
      throw new Error(
        `Missing ${key}; deploy BDD stacks for ${names.environmentName} first`,
      );
    return value;
  };
  [apiUrl, personTable, eventsTable] = await Promise.all([
    output(names.personServiceStack, "PersonApiEndpoint"),
    output(names.personServiceStack, "PersonTableName"),
    output(names.mockStack, "BddEventsTableName"),
  ]);
  runLock = createRunLock(eventsTable);
  await runLock.acquire();
});
Before(async function (this: PersonWorld) {
  this.apiUrl = apiUrl;
  this.personTable = personTable;
  this.eventsTable = eventsTable;
  await clearBddTables(personTable, eventsTable);
});

AfterAll(async () => {
  await runLock?.release();
});
