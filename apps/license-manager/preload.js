const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tolouLicenseManager', {
  choosePrivateKey: () => ipcRenderer.invoke('license:choose-key'),
  issueLicense: (input) => ipcRenderer.invoke('license:issue', input)
});
