package com.example.localpc

import android.app.Presentation
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.hardware.display.DisplayManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.SystemClock
import android.provider.Settings
import android.util.Base64
import android.view.Display
import android.view.Gravity
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.abs
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

// Lets the phone (trackpad + keyboard) UI reach the live Aurora OS session
// showing on the external display.
object PresentationBridge {
    var current: CastPresentation? = null
}

// Global on/off switch for forwarding a USB-connected keyboard/mouse to the
// TV instead of letting it control the phone UI. Toggled from MainScreen.
object RemoteInputSettings {
    @Volatile var usbPassthroughEnabled = true
}

private val BLOCKED_PHYSICAL_KEYS = setOf(
    KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN, KeyEvent.KEYCODE_POWER,
    KeyEvent.KEYCODE_HOME, KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_APP_SWITCH, KeyEvent.KEYCODE_MENU
)

/** Downscales the picked photo (so the evaluateJavascript payload stays a
 *  sane size) and returns it as a "data:image/jpeg;base64,..." URL, or null
 *  on failure. Runs on Dispatchers.IO -- do not call from the main thread. */
private fun uriToWallpaperDataUrl(context: Context, uri: Uri): String? {
    return try {
        val input = context.contentResolver.openInputStream(uri) ?: return null
        val original = input.use { BitmapFactory.decodeStream(it) } ?: return null

        val maxDim = 1600
        val scale = minOf(1f, maxDim.toFloat() / maxOf(original.width, original.height))
        val scaled = if (scale < 1f) {
            Bitmap.createScaledBitmap(
                original, (original.width * scale).toInt(), (original.height * scale).toInt(), true
            )
        } else original

        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 80, out)
        val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        "data:image/jpeg;base64,$base64"
    } catch (e: Exception) {
        null
    }
}

/**
 * Extracts a third-party app zip (manifest.json/index.html/etc. at the zip
 * root -- no wrapping folder) into context.filesDir/apps/<manifest.id>/,
 * replacing any previous install of the same app id. Returns the raw
 * manifest.json text on success (so the caller can hand it straight to
 * AppManager.install() as a JS object literal), or null on failure.
 * Runs blocking I/O -- call from Dispatchers.IO.
 */
private fun installAppFromZip(context: Context, zipUri: Uri): String? {
    val tempDir = File(context.cacheDir, "app_install_tmp").apply {
        deleteRecursively()
        mkdirs()
    }
    return try {
        val opened = context.contentResolver.openInputStream(zipUri) ?: return null
        opened.use { input ->
            ZipInputStream(input).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val outFile = File(tempDir, entry.name)
                    // Zip-slip guard: refuse any entry that would land outside tempDir.
                    if (!outFile.canonicalPath.startsWith(tempDir.canonicalPath + File.separator)) {
                        throw SecurityException("Blocked path-traversal zip entry: ${entry.name}")
                    }
                    if (entry.isDirectory) {
                        outFile.mkdirs()
                    } else {
                        outFile.parentFile?.mkdirs()
                        FileOutputStream(outFile).use { fos -> zis.copyTo(fos) }
                    }
                    zis.closeEntry()
                    entry = zis.nextEntry
                }
            }
        }

        val manifestFile = File(tempDir, "manifest.json")
        if (!manifestFile.exists()) return null
        val manifestJson = manifestFile.readText()
        val id = JSONObject(manifestJson).getString("id")

        val finalDir = File(File(context.filesDir, "apps"), id)
        finalDir.deleteRecursively()
        finalDir.parentFile?.mkdirs()
        if (!tempDir.renameTo(finalDir)) {
            tempDir.copyRecursively(finalDir, overwrite = true)
        }
        manifestJson
    } catch (e: Exception) {
        null
    } finally {
        tempDir.deleteRecursively()
    }
}

class MainActivity : ComponentActivity() {

    // Tracks the last known absolute position of a physical (USB) mouse so
    // we can turn its absolute reports into the same relative deltas the
    // virtual trackpad uses.
    private var lastPhysX = 0f
    private var lastPhysY = 0f
    private var physTracking = false

    private val notificationPermissionLauncher =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MainScreen(onOpenCastSettings = {
                    startActivity(Intent(Settings.ACTION_CAST_SETTINGS))
                })
            }
        }

        // The TV session now lives in AuroraDisplayService, not here -- so
        // it keeps running even if this Activity is recreated or killed
        // (e.g. while the system file picker is in front for Install App).
        val serviceIntent = Intent(this, AuroraDisplayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // ---- Physical (USB) keyboard passthrough ----
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (RemoteInputSettings.usbPassthroughEnabled &&
            (event.source and InputDevice.SOURCE_KEYBOARD) == InputDevice.SOURCE_KEYBOARD &&
            event.deviceId != 0 && // 0 == the on-screen/software keyboard on most OEMs
            event.keyCode !in BLOCKED_PHYSICAL_KEYS
        ) {
            PresentationBridge.current?.forwardPhysicalKeyEvent(event)
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    // ---- Physical (USB) mouse passthrough ----
    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
        if (RemoteInputSettings.usbPassthroughEnabled &&
            (event.source and InputDevice.SOURCE_MOUSE) == InputDevice.SOURCE_MOUSE
        ) {
            when (event.actionMasked) {
                MotionEvent.ACTION_HOVER_MOVE -> {
                    if (physTracking) {
                        val dx = event.x - lastPhysX
                        val dy = event.y - lastPhysY
                        PresentationBridge.current?.moveCursorBy(dx, dy, dragging = false)
                    }
                    lastPhysX = event.x
                    lastPhysY = event.y
                    physTracking = true
                }
                MotionEvent.ACTION_BUTTON_PRESS -> when (event.actionButton) {
                    MotionEvent.BUTTON_PRIMARY -> PresentationBridge.current?.pressLeft()
                    MotionEvent.BUTTON_SECONDARY -> PresentationBridge.current?.pressRight()
                }
                MotionEvent.ACTION_BUTTON_RELEASE -> when (event.actionButton) {
                    MotionEvent.BUTTON_PRIMARY -> PresentationBridge.current?.releaseLeft()
                    MotionEvent.BUTTON_SECONDARY -> PresentationBridge.current?.releaseRight()
                }
            }
            return true
        }
        return super.dispatchGenericMotionEvent(event)
    }
}

@Composable
fun MainScreen(onOpenCastSettings: () -> Unit) {
    var usbPassthrough by remember { mutableStateOf(RemoteInputSettings.usbPassthroughEnabled) }
    var holdDrag by remember { mutableStateOf(false) }
    var selectedRatio by remember { mutableStateOf("16:9") } // default, per requirement

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Lets the person pick any photo already on the device as the TV
    // wallpaper -- no extra permission needed on API 33+ (Photo Picker),
    // and it degrades to GetContent on older versions.
    val wallpaperPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val dataUrl = withContext(Dispatchers.IO) { uriToWallpaperDataUrl(context, uri) }
            if (dataUrl != null) {
                PresentationBridge.current?.setWallpaperImage(dataUrl)
            }
        }
    }

    var installStatus by remember { mutableStateOf<String?>(null) }
    val appZipPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        installStatus = "Installing..."
        scope.launch {
            try {
                val manifestJson = withContext(Dispatchers.IO) { installAppFromZip(context, uri) }
                if (manifestJson != null) {
                    val presentation = PresentationBridge.current
                    if (presentation == null) {
                        installStatus = "Connect first (step 1), then reinstall"
                    } else {
                        presentation.installApp(manifestJson)
                        installStatus = "Installed -- check the desktop"
                    }
                } else {
                    installStatus = "Install failed -- check manifest.json is at the zip root"
                }
            } catch (e: Exception) {
                installStatus = "Install error: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    val ratioOptions = listOf(
        "16:9" to (16f to 9f),
        "4:3" to (4f to 3f),
        "21:9" to (21f to 9f),
        "1:1" to (1f to 1f)
    )

    // Landscape layout matching the sketch: a trackpad card (with its
    // Left/Right/Drag strip on the edge) plus an On/Off + quick-action
    // column, then a full-width keyboard card below.
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
    ) {
        // Aspect ratio (instant, TV box resizes live) + wallpaper picker.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Ratio:", fontSize = 12.sp)
            ratioOptions.forEach { (label, ratio) ->
                Button(
                    onClick = {
                        selectedRatio = label
                        PresentationBridge.current?.setAspectRatio(ratio.first, ratio.second)
                    },
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedRatio == label) MaterialTheme.colorScheme.secondary
                        else MaterialTheme.colorScheme.primary
                    )
                ) { Text(label, fontSize = 11.sp) }
            }
            Spacer(Modifier.weight(1f))
            Button(
                onClick = {
                    wallpaperPicker.launch(
                        androidx.activity.result.PickVisualMediaRequest(
                            ActivityResultContracts.PickVisualMedia.ImageOnly
                        )
                    )
                },
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) { Text("Wallpaper", fontSize = 11.sp) }

            Button(
                onClick = {
                    try {
                        // "*/*" instead of an exact "application/zip" -- several
                        // OEM file providers don't report zip files with that
                        // exact mime type, and GetContent throws immediately
                        // (crashing the app) if nothing matches the filter.
                        appZipPicker.launch("*/*")
                    } catch (e: Exception) {
                        installStatus = "No file picker available: ${e.message ?: e.javaClass.simpleName}"
                    }
                },
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) { Text("Install App", fontSize = 11.sp) }
        }

        installStatus?.let {
            Text(it, fontSize = 11.sp, color = Color.Gray, modifier = Modifier.padding(top = 2.dp))
        }

        Spacer(Modifier.height(6.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            TrackpadCard(
                holdDrag = holdDrag,
                onHoldDragToggle = { holdDrag = !holdDrag },
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(1f)
            )

            Spacer(Modifier.width(8.dp))

            // On/Off (USB passthrough) + quick-action column, to the right
            // of the trackpad card -- matches the sketch's side column.
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(72.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        usbPassthrough = !usbPassthrough
                        RemoteInputSettings.usbPassthroughEnabled = usbPassthrough
                    },
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(4.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (usbPassthrough) MaterialTheme.colorScheme.secondary
                        else Color(0xFF444444)
                    )
                ) {
                    Text(if (usbPassthrough) "ON" else "OFF", fontSize = 12.sp)
                }

                // "C to A" from the sketch, read as Ctrl+A / Select All --
                // flag it to me if you meant something else.
                Button(
                    onClick = {
                        PresentationBridge.current?.sendKeyEvent(
                            KeyEvent.KEYCODE_A, KeyEvent.META_CTRL_ON
                        )
                    },
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("Ctrl+A", fontSize = 11.sp)
                }

                Button(
                    onClick = onOpenCastSettings,
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("Connect", fontSize = 11.sp)
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        KeyboardCard(modifier = Modifier.fillMaxWidth().weight(1.1f))
    }
}

@Composable
fun TrackpadCard(
    holdDrag: Boolean,
    onHoldDragToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .border(2.dp, Color.White, RoundedCornerShape(16.dp))
            .background(Color.Black, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
    ) {
        // Left/Right/Drag strip along the edge, as in the sketch.
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(56.dp)
        ) {
            EdgeButton(label = "Left", modifier = Modifier.weight(1f)) {
                PresentationBridge.current?.tapClick()
            }
            EdgeButton(label = "Right", modifier = Modifier.weight(1f)) {
                PresentationBridge.current?.tapRightClick()
            }
            EdgeButton(
                label = if (holdDrag) "Drag:ON" else "Drag:OFF",
                modifier = Modifier.weight(1f),
                highlighted = holdDrag
            ) { onHoldDragToggle() }
        }

        // Main drag surface.
        var totalDx by remember { mutableStateOf(0f) }
        var totalDy by remember { mutableStateOf(0f) }
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .weight(1f)
                .pointerInput(holdDrag) {
                    detectDragGestures(
                        onDragStart = {
                            totalDx = 0f; totalDy = 0f
                            if (holdDrag) PresentationBridge.current?.pressLeft()
                        },
                        onDragEnd = {
                            if (holdDrag) {
                                PresentationBridge.current?.releaseLeft()
                            } else if (abs(totalDx) < 12f && abs(totalDy) < 12f) {
                                PresentationBridge.current?.tapClick()
                            }
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            totalDx += dragAmount.x
                            totalDy += dragAmount.y
                            PresentationBridge.current?.moveCursorBy(
                                dragAmount.x * 1.6f, dragAmount.y * 1.6f, dragging = holdDrag
                            )
                        }
                    )
                },
            contentAlignment = Alignment.Center
        ) {
            Text("mousepad", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun EdgeButton(
    label: String,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, Color.White)
            .background(if (highlighted) Color(0xFF444444) else Color.Black)
            .clickableNoRipple(onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun KeyboardCard(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .border(2.dp, Color.White, RoundedCornerShape(16.dp))
            .background(Color.Black, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .padding(6.dp)
    ) {
        VirtualKeyboard()
    }
}

@Composable
fun VirtualKeyboard() {
    var shiftOn by remember { mutableStateOf(false) }
    var ctrlOn by remember { mutableStateOf(false) }
    var altOn by remember { mutableStateOf(false) }
    val rows = listOf("1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM")

    fun charToKeyCode(c: Char): Int? = when {
        c in 'A'..'Z' -> KeyEvent.KEYCODE_A + (c - 'A')
        c in '0'..'9' -> KeyEvent.KEYCODE_0 + (c - '0')
        else -> null
    }

    fun currentMeta(): Int {
        var meta = 0
        if (shiftOn) meta = meta or KeyEvent.META_SHIFT_ON
        if (ctrlOn) meta = meta or KeyEvent.META_CTRL_ON
        if (altOn) meta = meta or KeyEvent.META_ALT_ON
        return meta
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceEvenly
    ) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                row.forEach { c ->
                    KeyButton(
                        label = if (shiftOn) c.toString() else c.toString().lowercase(),
                        modifier = Modifier.weight(1f)
                    ) {
                        charToKeyCode(c)?.let { keyCode ->
                            PresentationBridge.current?.sendKeyEvent(keyCode, currentMeta())
                            if (ctrlOn) ctrlOn = false
                            if (altOn) altOn = false
                        }
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            KeyButton(label = "Ctrl", modifier = Modifier.weight(1.3f), highlighted = ctrlOn) {
                ctrlOn = !ctrlOn
            }
            KeyButton(label = "Alt", modifier = Modifier.weight(1.3f), highlighted = altOn) {
                altOn = !altOn
            }
            KeyButton(label = "Shift", modifier = Modifier.weight(1.3f), highlighted = shiftOn) {
                shiftOn = !shiftOn
            }
            KeyButton(label = "Space", modifier = Modifier.weight(3f)) {
                PresentationBridge.current?.sendKeyEvent(KeyEvent.KEYCODE_SPACE, currentMeta())
            }
            KeyButton(label = "\u232B", modifier = Modifier.weight(1f)) {
                PresentationBridge.current?.sendKeyEvent(KeyEvent.KEYCODE_DEL)
            }
            KeyButton(label = "Enter", modifier = Modifier.weight(1.3f)) {
                PresentationBridge.current?.sendKeyEvent(KeyEvent.KEYCODE_ENTER)
            }
        }
    }
}

@Composable
fun KeyButton(
    label: String,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(36.dp),
        contentPadding = PaddingValues(0.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (highlighted) MaterialTheme.colorScheme.secondary
            else MaterialTheme.colorScheme.primary
        )
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

// Small helper: a plain clickable modifier without the ripple's default
// minimum touch target expansion, so the thin edge buttons in the sketch
// stay thin.
@Composable
fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier = this.clickable(
    indication = null,
    interactionSource = remember { MutableInteractionSource() }
) { onClick() }


// -------------------------------------------------------------------------
// TV DISPLAY: hosts Aurora OS in a WebView, served through WebViewAssetLoader
// (a proper virtual https origin -- what Aurora's own README recommends for
// IndexedDB reliability, instead of a bare file:// URL). Real MotionEvent /
// KeyEvent objects are dispatched into it so Aurora's own window.js /
// input.js handle drag, focus, clicks, and shortcuts completely unmodified.
// A custom on-page cursor (js/remote-cursor.js) renders where the pointer
// currently is, since there's no physical pointer device on this display.
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// Foreground service that owns the external display session. Moved out of
// MainActivity so the TV output (Aurora OS, cursor, everything) keeps
// running even if the Activity is recreated or killed by the OS -- e.g.
// while the system file picker is in front for Install App, or if the
// person switches to another app for a while.
// -------------------------------------------------------------------------
class AuroraDisplayService : Service() {

    private var currentPresentation: CastPresentation? = null
    private var displayListener: DisplayManager.DisplayListener? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification())
        setupSecondaryDisplayScanner()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupSecondaryDisplayScanner() {
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val listener = object : DisplayManager.DisplayListener {
            override fun onDisplayAdded(displayId: Int) { updateTVDisplay() }
            override fun onDisplayRemoved(displayId: Int) { updateTVDisplay() }
            override fun onDisplayChanged(displayId: Int) { updateTVDisplay() }
        }
        displayListener = listener
        displayManager.registerDisplayListener(listener, null)
        updateTVDisplay()
    }

    private fun updateTVDisplay() {
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val displays = displayManager.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)

        if (displays.isEmpty()) {
            currentPresentation?.dismiss()
            currentPresentation = null
            PresentationBridge.current = null
        } else {
            val display = displays[0]
            if (currentPresentation?.display?.displayId != display.displayId) {
                currentPresentation?.dismiss()
                currentPresentation = CastPresentation(this, display)
                currentPresentation?.show()
                PresentationBridge.current = currentPresentation
            }
        }
    }

    private fun buildNotification(): android.app.Notification {
        val channelId = "aurora_display_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId, "Aurora OS Display", android.app.NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(channel)
        }
        return androidx.core.app.NotificationCompat.Builder(this, channelId)
            .setContentTitle("Aurora OS running")
            .setContentText("Stays connected in the background")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        displayListener?.let { displayManager.unregisterDisplayListener(it) }
        currentPresentation?.dismiss()
        currentPresentation = null
        PresentationBridge.current = null
    }

    companion object {
        private const val NOTIFICATION_ID = 2001
    }
}



class CastPresentation(context: Context, display: Display) : Presentation(context, display) {

    private lateinit var webView: WebView
    private lateinit var aspectContainer: FrameLayout
    private val displayMetrics = android.util.DisplayMetrics()
    private var cursorX = 0f
    private var cursorY = 0f
    private var leftDownTime = 0L
    private var rightDownTime = 0L
    private var currentRatioW = 16f
    private var currentRatioH = 9f

    // CSS pixels != Android View (device) pixels once the page has a
    // `width=device-width, initial-scale=1` viewport (Aurora's index.html
    // does). Real MotionEvents we dispatch must stay in device px for
    // correct hit-testing, but the *visual* cursor position we send into
    // JS has to be converted to CSS px, or it drifts further off-screen
    // the closer it gets to the right/bottom edge -- which is exactly the
    // "cursor exits bottom/right" symptom.
    // Measured (not assumed) CSS-px-per-device-px scale, per axis. Filled
    // in by remeasureCssScale() once the page has actually loaded -- an
    // assumed 1/density guess doesn't always match WebView's real internal
    // scale, which is what made the cursor fall short of the true edges.
    private var cssWidthScale = 1f
    private var cssHeightScale = 1f

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val rootLayout = FrameLayout(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
        }
        aspectContainer = FrameLayout(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
        }

        // Third-party apps get extracted to context.filesDir/apps/<id>/ on
        // the phone; InternalStoragePathHandler serves that folder under
        // /local-apps/, so an app ends up reachable at exactly
        // https://appassets.androidplatform.net/local-apps/<id>/index.html
        val thirdPartyAppsDir = java.io.File(context.filesDir, "apps").apply { mkdirs() }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
            .addPathHandler("/local-apps/", WebViewAssetLoader.InternalStoragePathHandler(context, thirdPartyAppsDir))
            .build()

        webView = WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            isFocusable = true
            isFocusableInTouchMode = true
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    remeasureCssScale()
                }
            }
        }
        webView.loadUrl("https://appassets.androidplatform.net/assets/aurora-os/index.html")

        aspectContainer.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        rootLayout.addView(
            aspectContainer,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )
        setContentView(rootLayout)

        display.getMetrics(displayMetrics)
        applyAspectRatio(currentRatioW, currentRatioH) // 16:9 default

        webView.post {
            cursorX = webView.width / 2f
            cursorY = webView.height / 2f
            webView.requestFocus()
        }
    }

    /** Re-sizes the letterboxed box live -- e.g. setAspectRatio(4f, 3f).
     *  Safe to call any time after the Presentation is showing. */
    fun setAspectRatio(ratioW: Float, ratioH: Float) {
        currentRatioW = ratioW
        currentRatioH = ratioH
        applyAspectRatio(ratioW, ratioH)
    }

    private fun applyAspectRatio(ratioW: Float, ratioH: Float) {
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels
        val screenRatio = screenWidth.toFloat() / screenHeight.toFloat()
        val targetRatio = ratioW / ratioH

        val params = aspectContainer.layoutParams as FrameLayout.LayoutParams
        if (screenRatio > targetRatio) {
            params.height = screenHeight
            params.width = (screenHeight * targetRatio).toInt()
        } else {
            params.width = screenWidth
            params.height = (screenWidth / targetRatio).toInt()
        }
        aspectContainer.layoutParams = params

        // Cursor bounds shrink/grow with the box -- keep it on-screen, and
        // re-measure since the CSS-px-per-device-px ratio can shift with
        // the new box size.
        webView.postDelayed({ remeasureCssScale() }, 80)
        webView.post {
            cursorX = cursorX.coerceIn(0f, webView.width.toFloat())
            cursorY = cursorY.coerceIn(0f, webView.height.toFloat())
        }
    }

    /** Pushes a device photo (as a data: URL) to Aurora as the desktop wallpaper. */
    fun setWallpaperImage(dataUrl: String) {
        webView.post {
            webView.evaluateJavascript(
                "window.AuroraWallpaper && window.AuroraWallpaper.setCustomImage(${JSONObject.quote(dataUrl)})",
                null
            )
        }
    }

    /** Registers a freshly-extracted third-party app with AppManager --
     *  manifestJson is valid JSON, which is also a valid JS object literal,
     *  so it can be spliced directly into the call. */
    fun installApp(manifestJson: String) {
        webView.post {
            webView.evaluateJavascript("window.AppManager && AppManager.install($manifestJson)", null)
        }
    }

    // ---- Mouse bridge ----

    private fun buildMouseEvent(action: Int, buttonState: Int, downTime: Long): MotionEvent {
        val now = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = cursorX; y = cursorY; pressure = 1f; size = 1f
        })
        return MotionEvent.obtain(
            downTime, now, action, 1, props, coords,
            0, buttonState, 1f, 1f, 0, 0, InputDevice.SOURCE_MOUSE, 0
        )
    }

    /** Measures the page's actual CSS viewport against the WebView's real
     *  device-pixel size, so the visual cursor's coordinate conversion is
     *  correct regardless of WebView's internal zoom behavior -- fixes the
     *  cursor falling short of the real right/bottom edges. */
    private fun remeasureCssScale() {
        webView.evaluateJavascript("window.innerWidth") { widthStr ->
            webView.evaluateJavascript("window.innerHeight") { heightStr ->
                val cssW = widthStr?.toFloatOrNull()
                val cssH = heightStr?.toFloatOrNull()
                val devW = webView.width.toFloat()
                val devH = webView.height.toFloat()
                if (cssW != null && cssH != null && cssW > 0 && cssH > 0 && devW > 0 && devH > 0) {
                    cssWidthScale = cssW / devW
                    cssHeightScale = cssH / devH
                }
            }
        }
    }

    private fun updateVisualCursor() {
        // cursorX/cursorY are in Android device pixels (correct for the real
        // dispatched MotionEvents above); the visual cursor div is positioned
        // in CSS pixels, so it needs the measured conversion above, or it
        // falls short of (or overshoots) the true edges.
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.evaluateJavascript(
            "window.__auroraCursor && window.__auroraCursor.move(${cssX}, ${cssY})", null
        )
    }

    /** Moves the cursor by a relative delta. `dragging=true` reports the
     *  move to JS as a held-button drag (for window-drag/selection);
     *  otherwise it's a plain native hover move. */
    fun moveCursorBy(dx: Float, dy: Float, dragging: Boolean) {
        cursorX = (cursorX + dx).coerceIn(0f, webView.width.toFloat())
        cursorY = (cursorY + dy).coerceIn(0f, webView.height.toFloat())
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            if (dragging) {
                webView.evaluateJavascript(
                    "window.__auroraCursor && window.__auroraCursor.dragMove(${cssX}, ${cssY})", null
                )
            } else {
                webView.dispatchGenericMotionEvent(
                    buildMouseEvent(MotionEvent.ACTION_HOVER_MOVE, 0, SystemClock.uptimeMillis())
                )
            }
            updateVisualCursor()
        }
    }

    fun pressLeft() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.dragStart(${cssX}, ${cssY})", null
            )
        }
    }

    fun releaseLeft() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.dragEnd(${cssX}, ${cssY})", null
            )
        }
    }

    fun tapClick() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.clickAt(${cssX}, ${cssY}, 0)", null
            )
        }
    }

    fun pressRight() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.dragStart(${cssX}, ${cssY})", null
            )
        }
    }

    fun releaseRight() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.dragEnd(${cssX}, ${cssY})", null
            )
        }
    }

    fun tapRightClick() {
        val cssX = cursorX * cssWidthScale
        val cssY = cursorY * cssHeightScale
        webView.post {
            webView.evaluateJavascript(
                "window.__auroraCursor && window.__auroraCursor.clickAt(${cssX}, ${cssY}, 2)", null
            )
        }
    }

    // ---- Keyboard bridge ----

    /** Sends a synthetic down+up key pulse -- used by the on-screen keyboard. */
    fun sendKeyEvent(keyCode: Int, metaState: Int = 0) {
        val time = SystemClock.uptimeMillis()
        webView.post {
            webView.requestFocus()
            webView.dispatchKeyEvent(KeyEvent(time, time, KeyEvent.ACTION_DOWN, keyCode, 0, metaState))
            webView.dispatchKeyEvent(KeyEvent(time, SystemClock.uptimeMillis(), KeyEvent.ACTION_UP, keyCode, 0, metaState))
        }
    }

    /** Relays a real KeyEvent from a USB-connected keyboard as-is. */
    fun forwardPhysicalKeyEvent(event: KeyEvent) {
        webView.post {
            webView.requestFocus()
            webView.dispatchKeyEvent(event)
        }
    }

    override fun onStop() {
        super.onStop()
        webView.destroy()
    }
}
