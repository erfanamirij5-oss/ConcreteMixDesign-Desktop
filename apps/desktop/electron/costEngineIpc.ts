import { ipcMain } from 'electron';
import { calculateRevisionCost, listCostInputSets, saveCostInputSet, type SaveCostInputSetInput } from './costEngineService';
import { requireRendererPermission } from './securityRuntime';

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

export function registerCostEngineIpc() {
  ipcMain.handle('cost-engine:save-input-set', async (event, payload: SaveCostInputSetInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return saveCostInputSet({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت Cost Input Set'));

  ipcMain.handle('cost-engine:list-input-sets', async (event, mixDesignId: string, revisionNumber?: number) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, inputSets: listCostInputSets(mixDesignId, revisionNumber) };
  }, 'خطا در خواندن Cost Input Setها'));

  ipcMain.handle('cost-engine:calculate-revision', async (event, mixDesignId: string, revisionNumber: number, inputSetId?: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return calculateRevisionCost(mixDesignId, revisionNumber, inputSetId);
  }, 'خطا در محاسبه هزینه Revision'));
}
