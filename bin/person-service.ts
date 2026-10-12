#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { PersonServiceStack } from "../src/microservices/person-service/stack";
import { WelcomeServiceStack } from "../src/microservices/welcome-service/stack";
import { EventBusStack } from "../src/microservices/event-bus/stack";
import { MockStack } from "../bdd/stack";
import { deploymentConfig } from "./config";

const app = new cdk.App();
const stage: string = app.node.tryGetContext("stage") ?? "dev";
for (const bdd of [false, true]) {
  const names = deploymentConfig(stage, bdd);
  const props = {
    stackStage: names.stackStage,
    environmentName: names.environmentName,
  };
  const bus = new EventBusStack(app, names.eventBusStack, props);
  const persons = new PersonServiceStack(app, names.personServiceStack, props);
  persons.addStackDependency(bus);
  const welcome = new WelcomeServiceStack(
    app,
    names.welcomeServiceStack,
    props,
  );
  welcome.addStackDependency(bus);
  if (bdd) {
    const collector = new MockStack(app, names.mockStack, props);
    collector.addStackDependency(bus);
  }
}
