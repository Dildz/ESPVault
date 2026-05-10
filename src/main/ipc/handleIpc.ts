import type { IpcMainInvokeEvent } from "electron";
import type { ApiResult } from "../../shared/types/ipc";

export function handleIpc<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => TResult | Promise<TResult>
): (_event: IpcMainInvokeEvent, ...args: TArgs) => Promise<ApiResult<TResult>> {
  return async (_event, ...args) => {
    try {
      return {
        ok: true,
        data: await handler(...args)
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The action could not be completed.";
      console.error(error);

      return {
        ok: false,
        error: {
          message
        }
      };
    }
  };
}

