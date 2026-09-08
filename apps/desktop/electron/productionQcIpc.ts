import { ipcMain } from 'electron';
import { requireRendererPermission } from './securityRuntime';
import { getProductionQcStrengthAnalytics } from './productionQcAnalyticsService';
import {
  createProductionBatch,
  getProductionBatchDetail,
  listProductionBatches,
  saveProductionMaterialActual,
  saveProductionSpecimen,
  saveProductionStrengthResult,
  type CreateProductionBatchInput,
  type SaveProductionMaterialActualInput,
  type SaveProductionSpecimenInput,
  type SaveProductionStrengthResultInput
} from './productionQcService';

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

export function registerProductionQcIpc() {
  ipcMain.handle('production-qc:create-batch', async (event, payload: CreateProductionBatchInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return createProductionBatch({ ...payload, actorName: actor.displayName });
  }, 'خطا در ایجاد Production Batch'));

  ipcMain.handle('production-qc:list-batches', async (event, mixDesignId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, batches: listProductionBatches(mixDesignId) };
  }, 'خطا در خواندن Production Batchها'));

  ipcMain.handle('production-qc:get-batch', async (event, productionBatchId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, detail: getProductionBatchDetail(productionBatchId) };
  }, 'خطا در خواندن جزئیات Production Batch'));

  ipcMain.handle('production-qc:get-strength-analytics', async (event, mixDesignId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return getProductionQcStrengthAnalytics(mixDesignId);
  }, 'خطا در تحلیل توصیفی مقاومت Production/QC'));

  ipcMain.handle('production-qc:save-material-actual', async (event, payload: SaveProductionMaterialActualInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return saveProductionMaterialActual({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت مصالح واقعی Production'));

  ipcMain.handle('production-qc:save-specimen', async (event, payload: SaveProductionSpecimenInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return saveProductionSpecimen({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت نمونه Production'));

  ipcMain.handle('production-qc:save-strength-result', async (event, payload: SaveProductionStrengthResultInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return saveProductionStrengthResult({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت نتیجه مقاومت Production'));
}
