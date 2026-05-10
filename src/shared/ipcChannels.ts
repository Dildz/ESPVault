export const IPC_CHANNELS = {
  boards: {
    list: "boards:list",
    get: "boards:get",
    create: "boards:create",
    update: "boards:update",
    delete: "boards:delete",
    dashboardStats: "boards:dashboard-stats"
  },
  serialDetection: {
    scanMock: "serial-detection:scan-mock"
  }
} as const;

