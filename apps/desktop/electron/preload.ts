import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tolouEngine', {
  health: () => ipcRenderer.invoke('engine:health'),
  calculateNormalMix: (payload: unknown) => ipcRenderer.invoke('engine:calculate-normal-mix', payload),
  calculateSavedMix: (mixDesignId: string) => ipcRenderer.invoke('engine:calculate-saved-mix', mixDesignId),
  getSavedResult: (mixDesignId: string) => ipcRenderer.invoke('engine:get-saved-result', mixDesignId),
  evaluateDurability: (payload: unknown) => ipcRenderer.invoke('engine:evaluate-durability', payload)
});

contextBridge.exposeInMainWorld('tolouProjects', {
  saveIntake: (payload: unknown) => ipcRenderer.invoke('projects:save-intake', payload),
  listRecent: () => ipcRenderer.invoke('projects:list-recent')
});

contextBridge.exposeInMainWorld('tolouManagement', {
  getSummary: () => ipcRenderer.invoke('management:get-summary'),
  getActivity: () => ipcRenderer.invoke('management:get-activity')
});

contextBridge.exposeInMainWorld('tolouMixDesigns', {
  getManagementRecord: (mixDesignId: string) => ipcRenderer.invoke('mix-design:get-management-record', mixDesignId),
  updateBasics: (payload: unknown) => ipcRenderer.invoke('mix-design:update-basics', payload),
  createRevision: (payload: unknown) => ipcRenderer.invoke('mix-design:create-revision', payload),
  listRevisions: (mixDesignId: string) => ipcRenderer.invoke('mix-design:list-revisions', mixDesignId),
  allowedStatuses: (mixDesignId: string) => ipcRenderer.invoke('mix-design:allowed-statuses', mixDesignId),
  transitionStatus: (payload: unknown) => ipcRenderer.invoke('mix-design:transition-status', payload),
  duplicate: (payload: unknown) => ipcRenderer.invoke('mix-design:duplicate', payload),
  archive: (mixDesignId: string, actorName?: string) => ipcRenderer.invoke('mix-design:archive', mixDesignId, actorName),
  restore: (mixDesignId: string, actorName?: string) => ipcRenderer.invoke('mix-design:restore', mixDesignId, actorName)
});

contextBridge.exposeInMainWorld('tolouMaterials', {
  save: (payload: unknown) => ipcRenderer.invoke('materials:save', payload),
  listByMixDesign: (mixDesignId: string) => ipcRenderer.invoke('materials:list-by-mix-design', mixDesignId)
});

contextBridge.exposeInMainWorld('tolouMaterialLibrary', {
  save: (payload: unknown) => ipcRenderer.invoke('material-library:save', payload),
  list: (materialType?: string) => ipcRenderer.invoke('material-library:list', materialType),
  attach: (mixDesignId: string, libraryMaterialId: string) => ipcRenderer.invoke('material-library:attach', mixDesignId, libraryMaterialId),
  setStatus: (id: string, status: 'active' | 'expired' | 'inactive') => ipcRenderer.invoke('material-library:set-status', id, status),
  listProvenance: (mixDesignId: string) => ipcRenderer.invoke('material-library:list-provenance', mixDesignId)
});

contextBridge.exposeInMainWorld('tolouGradation', {
  save: (payload: unknown) => ipcRenderer.invoke('gradation:save', payload),
  listByMaterial: (materialId: string) => ipcRenderer.invoke('gradation:list-by-material', materialId)
});

contextBridge.exposeInMainWorld('tolouBlendOptimizer', {
  save: (payload: unknown) => ipcRenderer.invoke('blend-optimizer:save', payload),
  get: (mixDesignId: string) => ipcRenderer.invoke('blend-optimizer:get', mixDesignId)
});

contextBridge.exposeInMainWorld('tolouDurability', {
  save: (payload: unknown) => ipcRenderer.invoke('durability:save', payload),
  get: (mixDesignId: string) => ipcRenderer.invoke('durability:get', mixDesignId)
});
