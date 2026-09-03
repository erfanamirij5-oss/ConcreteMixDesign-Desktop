import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tolouEngine', {
  health: () => ipcRenderer.invoke('engine:health'),
  calculateNormalMix: (payload: unknown) => ipcRenderer.invoke('engine:calculate-normal-mix', payload)
});
