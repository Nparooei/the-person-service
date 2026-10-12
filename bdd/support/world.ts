import { World, setWorldConstructor } from "@cucumber/cucumber";
import { Person } from "../../src/microservices/shared/domain/entities";
import { PersonCreateInput } from "../../src/microservices/shared/domain/domainTransferObjects";

export class PersonWorld extends World {
  apiUrl!: string;
  personTable!: string;
  eventsTable!: string;
  payload!: PersonCreateInput;
  response!: { status: number; body: unknown };
  persons: Person[] = [];
}
setWorldConstructor(PersonWorld);
