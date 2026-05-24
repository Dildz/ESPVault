import { repositories } from "../repositories";
import type { DatabaseIntegrityResult } from "../repositories/DatabaseHealthRepository";

export interface StartupIntegrityIssue {
  detail: string | null;
  message: string;
  title: string;
}

export async function checkStartupIntegrity(): Promise<StartupIntegrityIssue | null> {
  const result = await repositories.databaseHealth.checkIntegrity();

  if (result.ok) {
    return null;
  }

  return {
    detail: formatIntegrityDetail(result),
    message:
      "ESP Board Vault could not verify the local database. This is different from an empty vault; your data may still be recoverable from an upgrade snapshot or backup export.",
    title: "Local database needs attention"
  };
}

export function createPendingMoveRestoreIssue(
  caughtError: unknown
): StartupIntegrityIssue {
  return {
    detail: getErrorMessage(caughtError),
    message:
      "The app could not finish restoring the moved app data. Your data may still be recoverable from the previous app data folder, an upgrade snapshot, or a backup export.",
    title: "App data move needs attention"
  };
}

function formatIntegrityDetail(result: DatabaseIntegrityResult): string {
  return [
    `Database: ${result.databaseName}`,
    `Schema: ${result.schemaVersion ?? "unknown"}`,
    result.detail
  ]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

function getErrorMessage(caughtError: unknown): string {
  return caughtError instanceof Error
    ? caughtError.message
    : "The startup check could not be completed.";
}
