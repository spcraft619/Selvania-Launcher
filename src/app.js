/**
 * @author Luuxiss
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const { app, ipcMain } = require('electron');
const Store = require('electron-store');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater')

const store = new Store();

const path = require('path');
const fs = require('fs');

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

let data
let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./AppData/Launcher').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    app.setPath('userData', appPath);
}
const clientId = '1156022885270442005';
const DiscordRPC = require('discord-rpc');
const RPC = new DiscordRPC.Client({ transport: 'ipc'});
DiscordRPC.register(clientId);

async function setActivity(){
    if (!RPC) return;
    RPC.setActivity({
        details: `Jugando a "DEDsafio Recreation"`,
        startTimestamp: Date.now(),
        largeImageKey: 'corta',
        largeImageText: `...`,
        instance: false,
    });
}
RPC.on('ready', async () => {
    setActivity();
 
    setInterval(() => {
        setActivity();
    }, 86400 * 1000);
 });
 RPC.login({ clientId }).catch(err => console.error(err));
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        setActivity();
        UpdateWindow.createWindow();
    });
}

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('main-window-close', () => MainWindow.destroyWindow())
ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow().setProgressBar(options.DL / options.totDL))
ipcMain.on('main-window-progress-reset', () => MainWindow.getWindow().setProgressBar(0))
ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize())

ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide())
ipcMain.on('main-window-show', () => MainWindow.getWindow().show())

ipcMain.handle('Microsoft-window', async(event, client_id) => {
    return await new Microsoft(client_id).getAuth();
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('electron-store-get-data', (event, key) => {
    const data = store.get(key);
    event.returnValue = data; // Enviar los datos de vuelta al proceso de renderizado
  });


autoUpdater.autoDownload = false;

ipcMain.handle('update-app', () => {
    return new Promise(async(resolve, reject) => {
        autoUpdater.checkForUpdates().then(() => {
            resolve();
        }).catch(error => {
            resolve({
                error: true,
                message: error
            })
        })
    })
})

autoUpdater.on('update-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
    autoUpdater.downloadUpdate();
})

autoUpdater.on('update-not-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('download-progress', progress);
})