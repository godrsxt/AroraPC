/* =========================================================
   AppRegistry — declarative list of installed apps.
   Each app defines how to render into a window body.
   Individual app modules (js/apps/*.js) call AppRegistry.register()
   ========================================================= */
const AppRegistry = (() => {
  const apps = {};

  function register(id, def){
    apps[id] = Object.assign({
      id,
      title: id,
      icon: '🗔',
      color: 'linear-gradient(135deg,#6d8bff,#b18cff)',
      defaultSize: { w: 720, h: 480 },
      pinned: true,
    }, def);
  }

  function get(id){ return apps[id]; }
  function all(){ return Object.values(apps); }
  function pinned(){ return all().filter(a => a.pinned); }

  return { register, get, all, pinned };
})();

/* =========================================================
   AppManager — ADDITION for dynamically-installed third-party
   apps (extracted ZIPs served from https://appassets.androidplatform.net/local-apps/{appId}/).
   Registers them into the existing AppRegistry so every part of
   the OS (desktop icons, start menu, WindowManager.open) treats
   them exactly like a built-in app -- no other file needed to
   know they're "third-party".
   ========================================================= */
const AppManager = (() => {
  const INSTALLED_KEY = 'installed-apps';
  const HIDDEN_KEY = 'desktop-hidden-apps';
  let desktopHidden = new Set();
  const LOCAL_APPS_ORIGIN = 'https://appassets.androidplatform.net/local-apps/';

  function buildMountFor(manifest){
    return function mount(body, ctx){
      const iframe = document.createElement('iframe');
      iframe.className = 'app-frame';
      iframe.src = `${LOCAL_APPS_ORIGIN}${manifest.id}/index.html`;
      // No "allow-same-origin" on purpose: this keeps the app in a truly
      // sandboxed opaque origin even though it's served from the same
      // virtual host as Aurora itself, so it can only talk to the OS
      // through postMessage (see WindowManager's message bridge).
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-popups');
      body.appendChild(iframe);

      iframe.addEventListener('load', () => {
        WindowManager.registerIframeSource(iframe.contentWindow, ctx.winId, manifest.id);
      });

      const unsubscribe = Bus.on('window:closed', ({ id }) => {
        if(id !== ctx.winId) return;
        WindowManager.unregisterIframeSource(iframe.contentWindow);
        unsubscribe();
      });
    };
  }

  function registerManifest(manifest){
    AppRegistry.register(manifest.id, {
      title: manifest.title || manifest.id,
      icon: manifest.icon
        ? `<img src="${LOCAL_APPS_ORIGIN}${manifest.id}/${manifest.icon}" style="width:100%;height:100%;object-fit:contain;">`
        : '🧩',
      color: manifest.color || 'linear-gradient(135deg,#6d8bff,#b18cff)',
      defaultSize: manifest.defaultSize || { w: 720, h: 480 },
      pinned: true,
      thirdParty: true,
      mount: buildMountFor(manifest)
    });
  }

  /** Registers the app immediately, persists its manifest so it survives
   *  a reload, then refreshes the desktop/start menu without a page refresh. */
  async function install(manifest){
    if(!manifest || !manifest.id) throw new Error('App manifest needs an id');
    registerManifest(manifest);

    const list = await AuroraStorage.kvGet(INSTALLED_KEY, []);
    const idx = list.findIndex(m => m.id === manifest.id);
    if(idx === -1) list.push(manifest); else list.splice(idx, 1, manifest);
    await AuroraStorage.kvSet(INSTALLED_KEY, list);

    if((typeof Desktop !== "undefined") && Desktop.renderIcons) Desktop.renderIcons();
    if((typeof Taskbar !== "undefined") && Taskbar.renderStartApps) Taskbar.renderStartApps();
    Bus.emit('app:installed', { id: manifest.id });
  }

  async function uninstall(appId){
    const list = await AuroraStorage.kvGet(INSTALLED_KEY, []);
    await AuroraStorage.kvSet(INSTALLED_KEY, list.filter(m => m.id !== appId));
    if((typeof Desktop !== "undefined") && Desktop.renderIcons) Desktop.renderIcons();
    if((typeof Taskbar !== "undefined") && Taskbar.renderStartApps) Taskbar.renderStartApps();
    Bus.emit('app:uninstalled', { id: appId });
  }

  function installedIds(){
    return AppRegistry.all().filter(a => a.thirdParty).map(a => a.id);
  }

  /** Re-registers every previously-installed app -- call this once on
   *  boot, before Desktop.init()/Taskbar.init(), so their first render
   *  already includes third-party apps installed in an earlier session. */
  async function restoreInstalledApps(){
    const list = await AuroraStorage.kvGet(INSTALLED_KEY, []);
    list.forEach(registerManifest);
    const hiddenList = await AuroraStorage.kvGet(HIDDEN_KEY, []);
    desktopHidden = new Set(hiddenList);
  }

  /** Removes an app's icon from the desktop without uninstalling it --
   *  it stays reachable from Start menu > All apps. */
  async function hideFromDesktop(appId){
    desktopHidden.add(appId);
    await AuroraStorage.kvSet(HIDDEN_KEY, Array.from(desktopHidden));
    if((typeof Desktop !== "undefined") && Desktop.renderIcons) Desktop.renderIcons();
  }

  /** Puts a previously-removed app's icon back on the desktop. */
  async function showOnDesktop(appId){
    desktopHidden.delete(appId);
    await AuroraStorage.kvSet(HIDDEN_KEY, Array.from(desktopHidden));
    if((typeof Desktop !== "undefined") && Desktop.renderIcons) Desktop.renderIcons();
  }

  function isHiddenFromDesktop(appId){
    return desktopHidden.has(appId);
  }

  return {
    install, uninstall, installedIds, restoreInstalledApps,
    hideFromDesktop, showOnDesktop, isHiddenFromDesktop
  };
})();
