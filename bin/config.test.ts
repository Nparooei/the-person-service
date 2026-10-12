import { deploymentConfig } from "./config";

describe("Deployment environments", () => {
  it("separates dev, production and BDD names", () => {
    const names = [
      deploymentConfig("dev"),
      deploymentConfig("prod"),
      deploymentConfig("dev", true),
    ];
    expect(new Set(names.map((n) => n.personServiceStack)).size).toBe(3);
    expect(new Set(names.map((n) => n.welcomeServiceStack)).size).toBe(3);
    expect(new Set(names.map((n) => n.stackStage)).size).toBe(3);
  });
  it.each(["", "DEV", "bad stage", "-dev", "a".repeat(21)])(
    "rejects unsafe stage %p",
    (stage) => expect(() => deploymentConfig(stage)).toThrow(),
  );
});
