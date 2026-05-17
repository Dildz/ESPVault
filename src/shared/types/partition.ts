export type BoardPartitionFilesystem = "fatfs" | "littlefs" | "spiffs";

export interface BoardPartition {
  label: string;
  type: number;
  typeHex: string;
  subtype: number;
  subtypeHex: string;
  offset: number;
  offsetHex: string;
  sizeBytes: number;
  sizeHex: string;
  flags: number;
  flagsHex: string;
  filesystem: BoardPartitionFilesystem | null;
}
