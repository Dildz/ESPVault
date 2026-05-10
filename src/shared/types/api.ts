import type { MockDetectedBoard } from "./serial";

export interface EspBoardVaultApi {
  serialDetection: {
    scanMock(): Promise<MockDetectedBoard>;
  };
}
