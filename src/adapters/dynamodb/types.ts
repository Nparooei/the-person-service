import { AttributeValue } from "@aws-sdk/client-dynamodb";

type UnMarshalledItem = Record<string, unknown>;
type MarshalledItem = Record<string, AttributeValue>;

export { UnMarshalledItem, MarshalledItem };
