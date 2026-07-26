/* =========================================================
   Browser — minimal address-bar browser (iframe based).
   Note: many sites block iframing (X-Frame-Options); the
   home page therefore favors iframe-friendly destinations.
   ========================================================= */
AppRegistry.register('browser', {
  title: 'Browser',
  icon: Icons.browser(),
  color: 'linear-gradient(135deg,#4facfe,#6d8bff)',
  defaultSize: { w: 900, h: 600 },
  mount(body, ctx){
    body.innerHTML = `
      <div class="browser-body">
        <div class="app-toolbar">
          <button id="bw-back">←</button>
          <button id="bw-home">🏠</button>
          <input id="bw-url" type="text" placeholder="Search or enter address">
          <button id="bw-go">Go</button>
        </div>
        <div id="bw-content" class="app-content" style="display:flex;flex-direction:column;"></div>
      </div>`;
    const content = body.querySelector('#bw-content');
    const urlInput = body.querySelector('#bw-url');

    function showHome(){
      urlInput.value = '';
      content.innerHTML = `
        <div class="browser-home">
          <h2>Aurora Browser</h2>
          <p style="color:var(--text-2);font-size:13px;">Type a web address above, or try a shortcut:</p>
          <div class="browser-shortcuts">
            <div class="bshort" data-u="https://en.wikipedia.org"><span style="font-size:26px;">📚</span><span>Wikipedia</span></div>
            <div class="bshort" data-u="https://example.com"><span style="font-size:26px;">🔗</span><span>Example.com</span></div>
            <div class="bshort" data-u="https://www.w3.org"><span style="font-size:26px;">🌐</span><span>W3C</span></div>
          </div>
        </div>`;
      content.querySelectorAll('.bshort').forEach(el => el.addEventListener('click', () => navigate(el.dataset.u)));
    }

    function navigate(url){
      if(!url) return;
      if(!/^https?:\/\//i.test(url)){
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url) + '&igu=1';
      }
      urlInput.value = url;
      content.innerHTML = `<iframe class="browser-frame" src="${url}"></iframe>`;
      ctx.setTitle((new URL(url).hostname) + ' — Browser');
    }

    body.querySelector('#bw-go').addEventListener('click', () => navigate(urlInput.value.trim()));
    urlInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') navigate(urlInput.value.trim()); });
    body.querySelector('#bw-home').addEventListener('click', showHome);
    body.querySelector('#bw-back').addEventListener('click', showHome);

    showHome();
  }
});
