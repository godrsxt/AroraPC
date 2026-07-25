/* =========================================================
   About — simple credits/info app
   ========================================================= */
AppRegistry.register('aboutme', {
  title: 'About Aurora',
  icon: Icons.about(),
  color: 'linear-gradient(135deg,#6d8bff,#4dd8c0)',
  defaultSize: { w: 380, h: 340 },
  singleInstance: true,
  mount(body){
    body.innerHTML = `
      <div class="about-body">
        <div class="about-logo">${Icons.about()}</div>
        <h2>Aurora OS</h2>
        <p>A desktop environment built with HTML, CSS &amp; JavaScript, styled after Windows 11's
        Fluent design language. Window manager, taskbar, a real folder-based file system, and a
        growing set of apps — all running in a browser tab, with your files saved locally.</p>
        <p style="font-size:11px;">Version 1.1 · Web edition</p>
      </div>`;
  }
});
