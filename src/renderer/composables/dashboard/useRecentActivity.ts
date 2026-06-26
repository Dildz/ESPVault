import { computed, type Ref } from "vue";
import type { Board, BoardDashboardStats } from "../../../shared/types/board";

export interface RecentActivityItem {
  board: Board;
  kind: string;
  label: string;
  icon: string;
  color: string;
  date: string | null;
}

export function useRecentActivity(dashboardStats: Ref<BoardDashboardStats | null>) {
  const recentActivity = computed<RecentActivityItem[]>(() => {
    const activity: RecentActivityItem[] = [
      ...(dashboardStats.value?.recentlyConnectedBoards ?? []).map((board) => ({
        board,
        kind: "Connection",
        label: "Connected",
        icon: "mdi-usb-port",
        color: "info",
        date: board.lastConnectedAt
      })),
      ...(dashboardStats.value?.recentlyUpdatedBoards ?? []).map((board) => ({
        board,
        kind: "Record update",
        label: "Updated",
        icon: "mdi-pencil-circle-outline",
        color: "primary",
        date: board.updatedAt
      }))
    ];

    return activity
      .sort(
        (left, right) =>
          new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime()
      )
      .slice(0, 6);
  });

  return { recentActivity };
}
