import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tolouEngine', {
  health: () => ipcRenderer.invoke('engine:health'),
  calculateNormalMix: (payload: unknown) => ipcRenderer.invoke('engine:calculate-normal-mix', payload),
  calculateSavedMix: (mixDesignId: string) => ipcRenderer.invoke('engine:calculate-saved-mix', mixDesignId),
  evaluateDurability: (payload: unknown) => ipcRenderer.invoke('engine:evaluate-durability', payload)
});

contextBridge.exposeInMainWorld('tolouProjects', {
  saveIntake: (payload: unknown) => ipcRenderer.invoke('projects:save-intake', payload),
  listRecent: () => ipcRenderer.invoke('projects:list-recent')
});

contextBridge.exposeInMainWorld('tolouMaterials', {
  save: (payload: unknown) => ipcRenderer.invoke('materials:save', payload),
  listByMixDesign: (mixDesignId: string) => ipcRenderer.invoke('materials:list-by-mix-design', mixDesignId)
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
