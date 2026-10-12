import { Person } from "../domain/entities";
import { IDynamoClient } from "../../../adapters/dynamodb";
import { Logger } from "../logging/logger";

export const personInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  phoneNumber: "+31612345678",
  address: {
    street: "Example Street",
    houseNumber: "10A",
    postalCode: "1011AB",
    city: "Amsterdam",
    country: "Netherlands",
  },
};
export const person: Person = {
  ...personInput,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  dateCreated: "2026-10-09T10:00:00.000Z",
};
export const mockLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});
export const mockDynamoClient = (): jest.Mocked<IDynamoClient> => ({
  putItem: jest.fn().mockResolvedValue({}),
  scanItems: jest.fn().mockResolvedValue({ items: [] }),
  deleteItem: jest.fn().mockResolvedValue({}),
});
