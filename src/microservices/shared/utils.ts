import { applicationConfig } from "../../infra/config";

function createResourceId(id: string) {
  return (
    applicationConfig().suffix + "-" + applicationConfig().region + "-" + id
  );
}

function currentTimestamp() {
  return new Date().toISOString();
}

function createStageName(stage: string, id: string): string {
  return `${stage}_${id}`;
}
function createExportStageName(stage: string, id: string): string {
  return `${stage}${id}`;
}
export {
  createResourceId,
  currentTimestamp,
  createStageName,
  createExportStageName,
};
