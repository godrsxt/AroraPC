/* =========================================================
   AuroraStorage — IndexedDB wrapper + virtual file system
   Stores: kv (settings/theme/wallpaper/window positions),
           files (real folder-based virtual FS: folders + files)
   Falls back to an in-memory map if IndexedDB is unavailable
   (e.g. sandboxed iframes) so the OS still boots.
   ========================================================= */
const AuroraStorage = (() => {
  const DB_NAME = 'aurora-os';
  const DB_VERSION = 1;
  let dbPromise = null;
  let memoryFallback = null;

  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if(!('indexedDB' in window)){
        memoryFallback = { kv:new Map(), files:new Map() };
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath:'key' });
        if(!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath:'path' });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => {
        memoryFallback = { kv:new Map(), files:new Map() };
        resolve(null);
      };
    });
    return dbPromise;
  }

  async function kvGet(key, fallback=null){
    const db = await openDB();
    if(!db) return memoryFallback.kv.has(key) ? memoryFallback.kv.get(key) : fallback;
    return new Promise((resolve) => {
      const tx = db.transaction('kv','readonly').objectStore('kv').get(key);
      tx.onsuccess = () => resolve(tx.result ? tx.result.value : fallback);
      tx.onerror = () => resolve(fallback);
    });
  }

  async function kvSet(key, value){
    const db = await openDB();
    if(!db){ memoryFallback.kv.set(key, value); return; }
    return new Promise((resolve) => {
      const tx = db.transaction('kv','readwrite').objectStore('kv').put({ key, value });
      tx.onsuccess = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function filesAll(){
    const db = await openDB();
    if(!db) return Array.from(memoryFallback.files.values());
    return new Promise((resolve) => {
      const req = db.transaction('files','readonly').objectStore('files').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function fileGet(path){
    const db = await openDB();
    if(!db) return memoryFallback.files.get(path) || null;
    return new Promise((resolve) => {
      const req = db.transaction('files','readonly').objectStore('files').get(path);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function fileSet(fileRecord){
    const db = await openDB();
    if(!db){ memoryFallback.files.set(fileRecord.path, fileRecord); return; }
    return new Promise((resolve) => {
      const tx = db.transaction('files','readwrite').objectStore('files').put(fileRecord);
      tx.onsuccess = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function fileDelete(path){
    const db = await openDB();
    if(!db){ memoryFallback.files.delete(path); return; }
    return new Promise((resolve) => {
      const tx = db.transaction('files','readwrite').objectStore('files').delete(path);
      tx.onsuccess = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function readAsDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function readAsText(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ---------------------------------------------------------
  // Real folder-based virtual file system helpers
  // ---------------------------------------------------------
  function pathJoin(parent, name){ return parent === '/' ? '/' + name : parent + '/' + name; }
  function parentOf(path){
    const i = path.lastIndexOf('/');
    return i <= 0 ? '/' : path.slice(0, i);
  }
  function appendCopySuffix(name, i){
    const dot = name.lastIndexOf('.');
    if(dot > 0) return `${name.slice(0,dot)} (${i})${name.slice(dot)}`;
    return `${name} (${i})`;
  }

  async function uniqueNameAndPath(parentPath, desiredName){
    const all = await filesAll();
    const siblingNames = new Set(all.filter(f => f.parent === parentPath && !f.deleted).map(f => f.name));
    let name = desiredName, i = 1;
    while(siblingNames.has(name)){ i++; name = appendCopySuffix(desiredName, i); }
    return { name, path: pathJoin(parentPath, name) };
  }

  async function listChildren(parentPath){
    const all = await filesAll();
    return all
      .filter(f => f.parent === parentPath && !f.deleted)
      .sort((a, b) => {
        if((a.type === 'folder') !== (b.type === 'folder')) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  async function createFolder(parentPath, desiredName='New folder'){
    const { name, path } = await uniqueNameAndPath(parentPath, desiredName);
    const rec = { path, name, type:'folder', parent:parentPath, modified: Date.now() };
    await fileSet(rec);
    return rec;
  }

  async function createTextFile(parentPath, desiredName='New Text Document.txt', content=''){
    const { name, path } = await uniqueNameAndPath(parentPath, desiredName);
    const rec = { path, name, type:'text', parent:parentPath, content, modified: Date.now() };
    await fileSet(rec);
    return rec;
  }

  // Move (and optionally rename) a file or folder, cascading path updates to any descendants.
  async function moveEntry(oldPath, newParentPath, newName){
    const rec = await fileGet(oldPath);
    if(!rec) return null;
    if(newParentPath === rec.parent && (!newName || newName === rec.name)) return rec;
    const desired = newName || rec.name;
    const { name, path: newPath } = await uniqueNameAndPath(newParentPath, desired);

    if(rec.type === 'folder'){
      const all = await filesAll();
      const descendants = all.filter(f => f.path.startsWith(oldPath + '/'));
      for(const d of descendants){
        const rel = d.path.slice(oldPath.length);
        const newDescPath = newPath + rel;
        const newDescParent = parentOf(newDescPath);
        await fileDelete(d.path);
        await fileSet({ ...d, path:newDescPath, parent:newDescParent });
      }
    }
    await fileDelete(oldPath);
    const newRec = { ...rec, path:newPath, parent:newParentPath, name };
    await fileSet(newRec);
    return newRec;
  }

  async function renameEntry(path, newName){
    const rec = await fileGet(path);
    if(!rec) return null;
    return moveEntry(path, rec.parent, newName);
  }

  // Soft-delete (move to Recycle Bin), cascading to descendants of a folder.
  async function trashEntry(path){
    const rec = await fileGet(path);
    if(!rec) return null;
    const now = Date.now();
    rec.deleted = true; rec.deletedAt = now;
    await fileSet(rec);
    if(rec.type === 'folder'){
      const all = await filesAll();
      const descendants = all.filter(f => f.path.startsWith(path + '/'));
      for(const d of descendants){ d.deleted = true; d.deletedAt = now; await fileSet(d); }
    }
    return rec;
  }

  async function restoreEntry(path){
    const rec = await fileGet(path);
    if(!rec) return null;
    delete rec.deleted; delete rec.deletedAt;
    await fileSet(rec);
    if(rec.type === 'folder'){
      const all = await filesAll();
      const descendants = all.filter(f => f.path.startsWith(path + '/'));
      for(const d of descendants){ delete d.deleted; delete d.deletedAt; await fileSet(d); }
    }
    return rec;
  }

  async function purgeEntry(path){
    const all = await filesAll();
    const descendants = all.filter(f => f.path.startsWith(path + '/'));
    for(const d of descendants) await fileDelete(d.path);
    await fileDelete(path);
  }

  // Imports a real File (e.g. dropped from the user's OS) into a folder.
  // Images are kept as data URLs; everything else is read as text.
  async function importFile(file, parentPath='/Downloads'){
    const isImage = file.type.startsWith('image/');
    const content = isImage ? await readAsDataURL(file) : await readAsText(file).catch(() => '');
    const { name, path } = await uniqueNameAndPath(parentPath, file.name);
    const record = { path, name, type: isImage ? 'image' : 'text', parent:parentPath, content, modified: Date.now() };
    await fileSet(record);
    return record;
  }

  // Seeds the default Windows-style top-level folders on first run.
  async function seedDefaultFolders(){
    const seeded = await kvGet('fs-seeded', false);
    if(seeded) return;
    const folders = ['Desktop','Documents','Pictures','Downloads','Music','Videos'];
    for(const f of folders){
      const existing = await fileGet('/' + f);
      if(!existing) await fileSet({ path:'/'+f, name:f, type:'folder', parent:'/', modified:Date.now() });
    }
    await createTextFile('/Documents', 'Welcome.txt',
      'Welcome to Aurora OS!\r\n\r\nThis is your Documents folder. Try:\r\n - Right-click here to create a new folder or text file\r\n - Drag files from your computer onto this window to import them\r\n - Drag a file onto a folder in the list to move it\r\n');
    await kvSet('fs-seeded', true);
  }

  return {
    kvGet, kvSet, filesAll, fileGet, fileSet, fileDelete, importFile,
    pathJoin, parentOf, uniqueNameAndPath, listChildren, createFolder, createTextFile,
    moveEntry, renameEntry, trashEntry, restoreEntry, purgeEntry, seedDefaultFolders
  };
})();