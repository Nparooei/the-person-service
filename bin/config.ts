import { z } from "zod";

export const StageSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]{0,19}$/,
    "Stage must be 1-20 lowercase letters, digits or hyphens, starting with a letter",
  );
export function deploymentConfig(stage: string, bdd = false) {
  const environmentName = StageSchema.parse(stage);
  const prefix = bdd ? "Bdd" : "App";
  return {
    environmentName,
    stackStage: `person-${bdd ? "bdd-" : ""}${environmentName}`,
    eventBusStack: `${prefix}-${environmentName}-EventBus`,
    personServiceStack: `${prefix}-${environmentName}-PersonService`,
    welcomeServiceStack: `${prefix}-${environmentName}-WelcomeService`,
    mockStack: `${prefix}-${environmentName}-EventCollector`,
  };
}
