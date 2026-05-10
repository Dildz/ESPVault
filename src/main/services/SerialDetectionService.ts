import type { MockDetectedBoard } from "../../shared/types/serial";

export class SerialDetectionService {
  async scanMock(): Promise<MockDetectedBoard> {
    return {
      chipModel: "ESP32-S3",
      macAddress: "24:6F:28:AA:BB:CC",
      flashSizeBytes: 16 * 1024 * 1024,
      psramSizeBytes: 8 * 1024 * 1024,
      crystalFrequency: "40 MHz",
      detectedAt: new Date().toISOString()
    };
  }
}

