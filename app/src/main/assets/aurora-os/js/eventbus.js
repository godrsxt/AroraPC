/* Simple global event bus so modules don't need to import each other */
const Bus = {
  _listeners: {},
  on(event, fn){
    (this._listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  },
  off(event, fn){
    if(!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  emit(event, payload){
    (this._listeners[event] || []).slice().forEach(fn => {
      try{ fn(payload); } catch(e){ console.error(`[Bus] listener for "${event}" threw`, e); }
    });
  }
};
