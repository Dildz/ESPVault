export interface DetectedEspBoard {
  chipModel: string | null;
  chipRevision: number | null;
  chipVariant: string | null;
  macAddress: string | null;
  flashSizeBytes: number | null;
  flashSizeLabel: string | null;
  psramSizeBytes: number | null;
  crystalFrequency: string | null;
  detectedAt: string;
  logs: string[];
}
