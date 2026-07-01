import type { Board, UpdateBoardInput } from "../../shared/types/board";
import type { DetectedEspBoard } from "../../shared/types/serial";

// Merge freshly detected scan data into an existing saved board. Only hardware
// fields are written — name, cover photo, links, notes and tags are left alone
// (they aren't part of UpdateBoardInput). A scanned field that reads null keeps
// the board's existing value rather than wiping it.
export function buildBoardUpdateInput(
  board: DetectedEspBoard,
  savedBoard: Board
): UpdateBoardInput {
  const partitionFields = buildPartitionUpdateFields(board, savedBoard);

  return {
    chipModel: keepExistingWhenUnknown(board.chipModel, savedBoard.chipModel),
    chipRevision: keepExistingWhenUnknown(board.chipRevision, savedBoard.chipRevision),
    chipVariant: keepExistingWhenUnknown(board.chipVariant, savedBoard.chipVariant),
    chipFamily: keepExistingWhenUnknown(board.chipFamily, savedBoard.chipFamily),
    chipFamilyHex: keepExistingWhenUnknown(board.chipFamilyHex, savedBoard.chipFamilyHex),
    macAddress: keepExistingWhenUnknown(board.macAddress, savedBoard.macAddress),
    flashSizeBytes: keepExistingWhenUnknown(
      board.flashSizeBytes,
      savedBoard.flashSizeBytes
    ),
    flashSizeLabel: keepExistingWhenUnknown(
      board.flashSizeLabel,
      savedBoard.flashSizeLabel
    ),
    flashChipId: keepExistingWhenUnknown(board.flashChipId, savedBoard.flashChipId),
    flashChipIdHex: keepExistingWhenUnknown(
      board.flashChipIdHex,
      savedBoard.flashChipIdHex
    ),
    flashManufacturerId: keepExistingWhenUnknown(
      board.flashManufacturerId,
      savedBoard.flashManufacturerId
    ),
    flashManufacturerIdHex: keepExistingWhenUnknown(
      board.flashManufacturerIdHex,
      savedBoard.flashManufacturerIdHex
    ),
    flashManufacturerName: keepExistingWhenUnknown(
      board.flashManufacturerName,
      savedBoard.flashManufacturerName
    ),
    flashDeviceId: keepExistingWhenUnknown(
      board.flashDeviceId,
      savedBoard.flashDeviceId
    ),
    flashDeviceIdHex: keepExistingWhenUnknown(
      board.flashDeviceIdHex,
      savedBoard.flashDeviceIdHex
    ),
    psramSizeBytes:
      board.psramDetected === false
        ? null
        : keepExistingWhenUnknown(board.psramSizeBytes, savedBoard.psramSizeBytes),
    psramDetected: keepExistingWhenUnknown(
      board.psramDetected,
      savedBoard.psramDetected
    ),
    crystalFrequency: keepExistingWhenUnknown(
      board.crystalFrequency,
      savedBoard.crystalFrequency
    ),
    securityFlags: keepExistingWhenUnknown(
      board.securityFlags,
      savedBoard.securityFlags
    ),
    securityFlagsHex: keepExistingWhenUnknown(
      board.securityFlagsHex,
      savedBoard.securityFlagsHex
    ),
    flashCryptCnt: keepExistingWhenUnknown(
      board.flashCryptCnt,
      savedBoard.flashCryptCnt
    ),
    flashCryptCntHex: keepExistingWhenUnknown(
      board.flashCryptCntHex,
      savedBoard.flashCryptCntHex
    ),
    securityKeyPurposes: keepExistingWhenUnknown(
      board.securityKeyPurposes,
      savedBoard.securityKeyPurposes
    ),
    securityChipId: keepExistingWhenUnknown(
      board.securityChipId,
      savedBoard.securityChipId
    ),
    securityApiVersion: keepExistingWhenUnknown(
      board.securityApiVersion,
      savedBoard.securityApiVersion
    ),
    secureBootEnabled: keepExistingWhenUnknown(
      board.secureBootEnabled,
      savedBoard.secureBootEnabled
    ),
    flashEncryptionEnabled: keepExistingWhenUnknown(
      board.flashEncryptionEnabled,
      savedBoard.flashEncryptionEnabled
    ),
    bootloaderOffset: keepExistingWhenUnknown(
      board.bootloaderOffset,
      savedBoard.bootloaderOffset
    ),
    bootloaderOffsetHex: keepExistingWhenUnknown(
      board.bootloaderOffsetHex,
      savedBoard.bootloaderOffsetHex
    ),
    ...partitionFields,
    lastConnectedAt: board.detectedAt,
    lastScannedAt: board.detectedAt
  };
}

export function buildPartitionUpdateFields(
  board: DetectedEspBoard,
  savedBoard: Board
): Pick<
  UpdateBoardInput,
  | "partitions"
  | "partitionTableOffset"
  | "partitionTableOffsetHex"
  | "partitionsDetectedAt"
  | "partitionTableReadError"
> {
  if (board.partitionTableReadError) {
    return {
      partitions: savedBoard.partitions,
      partitionTableOffset: savedBoard.partitionTableOffset,
      partitionTableOffsetHex: savedBoard.partitionTableOffsetHex,
      partitionsDetectedAt: savedBoard.partitionsDetectedAt,
      partitionTableReadError: board.partitionTableReadError
    };
  }

  return {
    partitions: board.partitions,
    partitionTableOffset: board.partitionTableOffset,
    partitionTableOffsetHex: board.partitionTableOffsetHex,
    partitionsDetectedAt: board.partitionsDetectedAt,
    partitionTableReadError: null
  };
}

export function keepExistingWhenUnknown<T>(value: T | null, existing: T | null): T | null {
  return value === null ? existing : value;
}
