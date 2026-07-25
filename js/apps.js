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
