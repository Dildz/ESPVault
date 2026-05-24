import { describe, expect, it } from "vitest";
import { getBackupReminder } from "./backupStatus";

describe("backup status", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");

  it("warns when a backup has never been recorded", () => {
    expect(getBackupReminder(null, now)).toMatchObject({
      shouldWarn: true,
      status: "never"
    });
  });

  it("does not warn when the last backup is within 14 days", () => {
    expect(
      getBackupReminder("2026-05-12T12:00:00.000Z", now, {
        currentAppVersion: "1.0.8",
        lastBackupAppVersion: "1.0.8"
      })
    ).toMatchObject({
      message: null,
      shouldWarn: false,
      status: "current"
    });
  });

  it("warns when the last backup is older than 14 days", () => {
    expect(
      getBackupReminder("2026-05-09T11:59:59.000Z", now)
    ).toMatchObject({
      shouldWarn: true,
      status: "stale"
    });
  });

  it("warns when the last backup version is different from the app version", () => {
    expect(
      getBackupReminder("2026-05-12T12:00:00.000Z", now, {
        currentAppVersion: "1.0.9",
        lastBackupAppVersion: "1.0.8"
      })
    ).toMatchObject({
      shouldWarn: true,
      status: "version_mismatch"
    });
  });

  it("warns when the app version is known but the backup version is missing", () => {
    expect(
      getBackupReminder("2026-05-12T12:00:00.000Z", now, {
        currentAppVersion: "1.0.9",
        lastBackupAppVersion: null
      })
    ).toMatchObject({
      shouldWarn: true,
      status: "version_mismatch"
    });
  });
});
