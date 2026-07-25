# Aurora OS — a Windows 11–styled desktop, in the browser

A desktop environment built with plain HTML, CSS, and JavaScript — styled after
Windows 11's Fluent Design language (Mica translucency, Segoe UI, centered taskbar,
8px window corners) with a real folder-based file system, a faithful Notepad and
Paint clone, and a couple of classic games. No build step, no frameworks.

> This is an original visual re-creation inspired by Windows 11's design language.
> It is not affiliated with or endorsed by Microsoft, and doesn't use any Microsoft
> logos, wordmarks, or copyrighted artwork — all icons are original SVGs.

## Run it

```bash
cd aurora-os
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

Or drag the folder into VS Code + Live Server, or upload it to any static host
(Netlify, Vercel, GitHub Pages, etc). It uses IndexedDB, so a local server (rather
than double-clicking the file) is the most reliable way to run it.

## What's inside

```
aurora-os/
├── index.html            Shell markup: boot/lock/desktop, Win11-style taskbar & Start menu
├── css/style.css          Fluent design tokens, Mica surfaces, window chrome, ribbon UI
└── js/
    ├── icons.js            Original Fluent-style SVG icon set (apps, files, folders)
    ├── eventbus.js         Tiny pub/sub used to decouple engine modules
    ├── storage.js          IndexedDB wrapper + real folder-based virtual file system
    ├── apps.js              App registry
    ├── notifications.js    Toasts + notification center
    ├── window.js            Window manager: drag, resize, snap, min/max, focus, virtual desktops
    ├── desktop.js           Wallpaper, desktop icons, right-click menu, file drop import
    ├── desktops.js          Task View panel (virtual desktop switcher)
    ├── taskbar.js           Start menu, running-apps, quick settings, notification center
    ├── input.js             Keyboard shortcuts, pointer/touch/stylus/gamepad detection
    ├── lockscreen.js, boot.js, main.js   Boot → lock → desktop flow, theme/wallpaper persistence
    └── apps/
        ├── explorer.js       File Explorer — real folders, breadcrumbs, create/rename/delete,
        │                     drag-and-drop to move items or import real files from your computer
        ├── notepad.js        Notepad clone — tabs, File/Edit/View menus, Find & Replace, word
        │                     wrap, zoom, Ln/Col status bar
        ├── paint.js          Paint clone — ribbon toolbar, pencil/brush/eraser/fill/eyedropper/
        │                     text/shapes, 2-color palette, flood fill, saves PNGs to Pictures
        ├── terminal.js       Terminal with a small built-in command set
        ├── calculator.js     Calculator
        ├── settings.js       Theme, wallpaper (6 palettes), system info, installed apps
        ├── browser.js         Address-bar browser (iframe based)
        ├── gallery.js         "Photos" — grid viewer for saved images
        ├── recyclebin.js      Restore or permanently delete removed files/folders
        ├── clock.js           World clock, stopwatch, countdown timer
        ├── minesweeper.js     Classic Minesweeper — flood reveal, flags, timer, 3 difficulties
        ├── game2048.js        2048 — arrow-key/swipe sliding tile puzzle
        └── aboutme.js         About panel
```

## Features

- **Windows 11–style visual system**: Segoe UI typography, Mica-translucent taskbar/
  windows/menus, 8px window corners, centered taskbar icon cluster with a search pill,
  Start menu with pinned app grid + Recommended section, Quick Settings flyout, light
  and dark themes, 6 wallpaper palettes in a Bloom-style flowing gradient
- **Real folder-based file system**: nested folders (not just flat prefixes), create/
  rename/move/delete with cascading updates to children, backed by IndexedDB
- **File Explorer**: breadcrumb address bar, Quick Access sidebar, New Folder / New
  Text Document, rename, delete to Recycle Bin, drag-and-drop to move items between
  folders, and drag-and-drop import of real files from your computer
- **Notepad clone**: tabbed documents, File/Edit/View menu bar, Find & Replace, word
  wrap, zoom, a Ln/Col + encoding status bar, Ctrl+N/O/S/F shortcuts
- **Paint clone**: ribbon toolbar with Tools/Shapes/Size/Colors groups, pencil, brush,
  eraser, flood-fill bucket, eyedropper, text tool, line/rectangle/rounded-rect/ellipse
  shapes, a 20-swatch palette plus custom color picker and two active colors (left/
  right click), saves PNGs into Pictures
- **Two games**: Minesweeper (Beginner/Intermediate/Expert, flagging, timer) and 2048
  (keyboard or swipe controls, scoring, win/lose detection)
- **Window manager**: drag, resize, snap-to-edge, maximize, minimize, virtual desktops
  with a Task View switcher (`Ctrl+Alt+←/→`), Alt+Tab cycling
- **Recycle Bin**: cascading soft-delete/restore for files and folders, empty-bin action
- Mouse, touch, stylus, and gamepad input detection; persistent theme/wallpaper/file
  state across reloads via IndexedDB

## Notes on scope

The engine (`window.js`, `desktop.js`, `taskbar.js`, `apps.js`) is written so new apps
drop into `js/apps/` with one `AppRegistry.register(...)` call — no changes needed
elsewhere. A plugin/extension system, an AI assistant, and voice control remain clean
extension points rather than full implementations, since each is a sizable project of
its own. The Paint and Notepad clones cover the core, everyday functionality of their
real-world counterparts (not every advanced menu item — e.g. Paint's image resize/
rotate and Notepad's full settings page are left as visual placeholders).
