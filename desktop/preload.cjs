const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('pulsepmDesktop', {
  platform: process.platform,
  version: '1.0.0'
});
