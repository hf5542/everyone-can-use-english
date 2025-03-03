import {
  app,
  BrowserWindow,
  BrowserView,
  Menu,
  ipcMain,
  shell,
  dialog,
  systemPreferences,
} from "electron";
import path from "path";
import db from "@main/db";
import settings from "@main/settings";
import downloader from "@main/downloader";
import whisper from "@main/whisper";
import fs from "fs-extra";
import "@main/i18n";
import log from "@main/logger";
import { WEB_API_URL, REPO_URL } from "@/constants";
import { AudibleProvider, TedProvider } from "@main/providers";
import Ffmpeg from "@main/ffmpeg";
import { Waveform } from "./waveform";
import url from "url";
import echogarden from "./echogarden";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = log.scope("window");

const audibleProvider = new AudibleProvider();
const tedProvider = new TedProvider();
const ffmpeg = new Ffmpeg();
const waveform = new Waveform();

const main = {
  win: null as BrowserWindow | null,
  init: () => {},
};

main.init = () => {
  if (main.win) {
    main.win.show();
    return;
  }

  // Prepare local database
  db.registerIpcHandlers();

  // Prepare Settings
  settings.registerIpcHandlers();

  // echogarden
  echogarden.registerIpcHandlers();

  // Whisper
  whisper.registerIpcHandlers();

  // Waveform
  waveform.registerIpcHandlers();

  // Downloader
  downloader.registerIpcHandlers();

  // ffmpeg
  ffmpeg.registerIpcHandlers();

  // AudibleProvider
  audibleProvider.registerIpcHandlers();

  // TedProvider
  tedProvider.registerIpcHandlers();

  // proxy
  ipcMain.handle("system-proxy-get", (_event) => {
    let proxy = settings.getSync("proxy");
    if (!proxy) {
      proxy = {
        enabled: false,
        url: "",
      };
      settings.setSync("proxy", proxy);
    }

    return proxy;
  });

  ipcMain.handle("system-proxy-set", (_event, config) => {
    if (!config) {
      throw new Error("Invalid proxy config");
    }

    if (config) {
      if (!config.url) {
        config.enabled = false;
      }
    }

    if (config.enabled && config.url) {
      const uri = new URL(config.url);
      const proxyRules = `http=${uri.host};https=${uri.host}`;

      mainWindow.webContents.session.setProxy({
        proxyRules,
      });
      mainWindow.webContents.session.closeAllConnections();
    } else {
      mainWindow.webContents.session.setProxy({
        mode: "system",
      });
      mainWindow.webContents.session.closeAllConnections();
    }

    return settings.setSync("proxy", config);
  });

  // BrowserView
  ipcMain.handle(
    "view-load",
    (
      event,
      url,
      bounds: { x: number; y: number; width: number; height: number },
      options?: {
        navigatable?: boolean;
      }
    ) => {
      const {
        x = 0,
        y = 0,
        width = mainWindow.getBounds().width,
        height = mainWindow.getBounds().height,
      } = bounds;
      const { navigatable = false } = options || {};

      logger.debug("view-load", url);
      const view = new BrowserView();
      view.setBackgroundColor("#fff");
      mainWindow.setBrowserView(view);

      view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
      view.setAutoResize({
        width: true,
        height: true,
        horizontal: true,
        vertical: true,
      });
      view.webContents.on("did-navigate", (_event, url) => {
        event.sender.send("view-on-state", {
          state: "did-navigate",
          url,
        });
      });
      view.webContents.on(
        "did-fail-load",
        (_event, _errorCode, errrorDescription, validatedURL) => {
          event.sender.send("view-on-state", {
            state: "did-fail-load",
            error: errrorDescription,
            url: validatedURL,
          });
          (view.webContents as any).destroy();
          mainWindow.removeBrowserView(view);
        }
      );
      view.webContents.on("did-finish-load", () => {
        view.webContents
          .executeJavaScript(`document.documentElement.innerHTML`)
          .then((html) => {
            event.sender.send("view-on-state", {
              state: "did-finish-load",
              html,
            });
          });
      });

      view.webContents.on("will-redirect", (detail) => {
        event.sender.send("view-on-state", {
          state: "will-redirect",
          url: detail.url,
        });

        logger.debug("will-redirect", detail.url);
        if (
          detail.url.startsWith(
            `${process.env.WEB_API_URL || WEB_API_URL}/oauth`
          )
        ) {
          logger.debug("prevent redirect", detail.url);
          detail.preventDefault();
        }
      });

      view.webContents.on("will-navigate", (detail) => {
        event.sender.send("view-on-state", {
          state: "will-navigate",
          url: detail.url,
        });

        logger.debug("will-navigate", detail.url);
        if (
          !navigatable ||
          detail.url.startsWith(
            `${process.env.WEB_API_URL || WEB_API_URL}/oauth`
          )
        ) {
          logger.debug("prevent navigation", detail.url);
          detail.preventDefault();
        }
      });
      view.webContents.loadURL(url);
    }
  );

  ipcMain.handle("view-remove", () => {
    logger.debug("view-remove");
    mainWindow.getBrowserViews().forEach((view) => {
      (view.webContents as any).destroy();
      mainWindow.removeBrowserView(view);
    });
  });

  ipcMain.handle("view-hide", () => {
    logger.debug("view-hide");
    const view = mainWindow.getBrowserView();
    if (!view) return;

    const bounds = view.getBounds();
    logger.debug("current view bounds", bounds);
    if (bounds.width === 0 && bounds.height === 0) return;

    view.setBounds({
      x: -Math.round(bounds.width),
      y: -Math.round(bounds.height),
      width: 0,
      height: 0,
    });
  });

  ipcMain.handle(
    "view-show",
    (
      _event,
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    ) => {
      const view = mainWindow.getBrowserView();
      if (!view) return;
      if (!bounds) return;

      logger.debug("view-show", bounds);
      const { x = 0, y = 0, width = 0, height = 0 } = bounds || {};
      view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    }
  );

  ipcMain.handle("view-scrape", (event, url) => {
    logger.debug("view-scrape", url);
    const view = new BrowserView();
    mainWindow.setBrowserView(view);

    view.webContents.on("did-navigate", (_event, url) => {
      event.sender.send("view-on-state", {
        state: "did-navigate",
        url,
      });
    });
    view.webContents.on(
      "did-fail-load",
      (_event, _errorCode, errrorDescription, validatedURL) => {
        event.sender.send("view-on-state", {
          state: "did-fail-load",
          error: errrorDescription,
          url: validatedURL,
        });
        (view.webContents as any).destroy();
        mainWindow.removeBrowserView(view);
      }
    );
    view.webContents.on("did-finish-load", () => {
      view.webContents
        .executeJavaScript(`document.documentElement.innerHTML`)
        .then((html) => {
          event.sender.send("view-on-state", {
            state: "did-finish-load",
            html,
          });
          (view.webContents as any).destroy();
          mainWindow.removeBrowserView(view);
        });
    });

    view.webContents.loadURL(url);
  });

  // App options
  ipcMain.handle("app-reset", () => {
    fs.removeSync(settings.userDataPath());
    fs.removeSync(settings.file());

    app.relaunch();
    app.exit();
  });

  ipcMain.handle("app-reset-settings", () => {
    fs.removeSync(settings.file());

    app.relaunch();
    app.exit();
  });

  ipcMain.handle("app-relaunch", () => {
    app.relaunch();
    app.exit();
  });

  ipcMain.handle("app-reload", () => {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }
  });

  ipcMain.handle("app-is-packaged", () => {
    return app.isPackaged;
  });

  ipcMain.handle("app-api-url", () => {
    return process.env.WEB_API_URL || WEB_API_URL;
  });

  ipcMain.handle("app-quit", () => {
    app.quit();
  });

  ipcMain.handle("app-open-dev-tools", () => {
    mainWindow.webContents.openDevTools();
  });

  ipcMain.handle("app-create-issue", (_event, title, log) => {
    const body = `**Version**

${app.getVersion()}

**Platform**

${process.platform} ${process.arch} ${process.getSystemVersion()}

**Log**
\`\`\`
${log}
\`\`\`
  `;

    const params = {
      title,
      body,
    };

    shell.openExternal(
      `${REPO_URL}/issues/new?${new URLSearchParams(params).toString()}`
    );
  });

  ipcMain.handle(
    "system-preferences-media-access",
    async (_event, mediaType: "microphone" | "camera") => {
      if (process.platform === "linux") return true;
      if (process.platform === "win32")
        return systemPreferences.getMediaAccessStatus(mediaType) === "granted";

      if (process.platform === "darwin") {
        const status = systemPreferences.getMediaAccessStatus(mediaType);
        logger.debug("system-preferences-media-access", status);
        if (status !== "granted") {
          const result = await systemPreferences.askForMediaAccess(mediaType);
          return result;
        } else {
          return true;
        }
      }
    }
  );

  // Shell
  ipcMain.handle("shell-open-external", (_event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle("shell-open-path", (_event, path) => {
    shell.openPath(path);
  });

  // Dialog
  ipcMain.handle("dialog-show-open-dialog", (event, options) => {
    return dialog.showOpenDialogSync(
      BrowserWindow.fromWebContents(event.sender),
      options
    );
  });

  ipcMain.handle("dialog-show-save-dialog", (event, options) => {
    return dialog.showSaveDialogSync(
      BrowserWindow.fromWebContents(event.sender),
      options
    );
  });

  ipcMain.handle("dialog-show-message-box", (event, options) => {
    return dialog.showMessageBoxSync(
      BrowserWindow.fromWebContents(event.sender),
      options
    );
  });

  ipcMain.handle("dialog-show-error-box", (_event, title, content) => {
    return dialog.showErrorBox(title, content);
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    icon: "./assets/icon.png",
    width: 1920,
    height: 1080,
    minWidth: 1440,
    minHeight: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "allow" };
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);

    // Open the DevTools.
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 100);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
    // mainWindow.webContents.openDevTools();
  }

  Menu.setApplicationMenu(null);

  main.win = mainWindow;
};

export default main;
