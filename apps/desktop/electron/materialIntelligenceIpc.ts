import { ipcMain } from 'electron';
import { requireRendererPermission } from './securityRuntime';
import {
  addMaterialObservation,
  addMaterialQualification,
  listMaterialObservations,
  listMaterialQualifications,
  type MaterialQualificationEventInput,
  type MaterialTestObservationInput
} from './materialIntelligenceStore';

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

export function registerMaterialIntelligenceIpc() {
  ipcMain.handle('material-intelligence:add-observation', async (event, payload: MaterialTestObservationInput) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.write');
    return { status: 'pass' as const, observation: addMaterialObservation(payload) };
  }, 'خطا در ثبت سابقه آزمون مصالح'));

  ipcMain.handle('material-intelligence:list-observations', async (event, materialLibraryId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, observations: listMaterialObservations(materialLibraryId) };
  }, 'خطا در خواندن سوابق آزمون مصالح'));

  ipcMain.handle('material-intelligence:add-qualification', async (event, payload: MaterialQualificationEventInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.write');
    return { status: 'pass' as const, qualification: addMaterialQualification({ ...payload, actor: actor.displayName }) };
  }, 'خطا در ثبت رویداد ارزیابی مصالح'));

  ipcMain.handle('material-intelligence:list-qualifications', async (event, materialLibraryId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, qualifications: listMaterialQualifications(materialLibraryId) };
  }, 'خطا در خواندن تاریخچه ارزیابی مصالح'));
}
