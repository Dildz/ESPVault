export interface EspBoardVaultApi {
  serial: {
    getLastSelectionCount(): Promise<number>;
  };
}
