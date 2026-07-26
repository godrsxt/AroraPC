/* =========================================================
   wallpaper-remote.js — ADDITION, does not touch settings.js
   Lets the Android side push a device photo as the desktop
   wallpaper, reusing the same persistence key ('wallpaper')
   the existing gradient system already uses in AuroraStorage.
   ========================================================= */
function applyCustomWallpaperImage(dataUrl){
  const desktop = document.getElementById('desktop');
  let bg = desktop.querySelector('.aurora-bg');
  if(!bg){
    bg = document.createElement('div');
    bg.className = 'aurora-bg';
    bg.innerHTML = '<div class="blob"></div>';
    desktop.prepend(bg);
  }
  bg.classList.add('custom-image');
  bg.style.backgroundImage = `url("${dataUrl}")`;
}

function clearCustomWallpaperImage(){
  const bg = document.querySelector('#desktop .aurora-bg');
  if(!bg) return;
  bg.classList.remove('custom-image');
  bg.style.backgroundImage = '';
}

window.AuroraWallpaper = {
  async setCustomImage(dataUrl){
    applyCustomWallpaperImage(dataUrl);
    await AuroraStorage.kvSet('wallpaper', 'custom');
    await AuroraStorage.kvSet('wallpaper-custom-data', dataUrl);
  },
  async restoreIfCustom(){
    const mode = await AuroraStorage.kvGet('wallpaper', 'bloom');
    if(mode !== 'custom') return false;
    const dataUrl = await AuroraStorage.kvGet('wallpaper-custom-data', null);
    if(!dataUrl) return false;
    applyCustomWallpaperImage(dataUrl);
    return true;
  }
};
