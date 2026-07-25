package com.example.localpc

import android.app.Presentation
import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.os.SystemClock
import android.provider.Settings
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
import androidx.activity.compose.setContent
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import kotlin.math.abs

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

class MainActivity : ComponentActivity() {
    private var currentPresentation: CastPresentation? = null

    // Tracks the last known absolute position of a physical (USB) mouse so
    // we can turn its absolute reports into the same relative deltas the
    // virtual trackpad uses.
    private var lastPhysX = 0f
    private var lastPhysY = 0f
    private var physTracking = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MainScreen(onOpenCastSettings = {
                    startActivity(Intent(Settings.ACTION_CAST_SETTINGS))
                })
            }
        }
        setupSecondaryDisplayScanner()
    }

    private fun setupSecondaryDisplayScanner() {
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val displayListener = object : DisplayManager.DisplayListener {
            override fun onDisplayAdded(displayId: Int) { updateTVDisplay() }
            override fun onDisplayRemoved(displayId: Int) { updateTVDisplay() }
            override fun onDisplayChanged(displayId: Int) { updateTVDisplay() }
        }
        displayManager.registerDisplayListener(displayListener, null)
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

    override fun onDestroy() {
        super.onDestroy()
        currentPresentation?.dismiss()
        currentPresentation = null
        PresentationBridge.current = null
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

    // Landscape layout matching the sketch: a trackpad card (with its
    // Left/Right/Drag strip on the edge) plus an On/Off + quick-action
    // column, then a full-width keyboard card below.
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
    ) {
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
class CastPresentation(context: Context, display: Display) : Presentation(context, display) {

    private lateinit var webView: WebView
    private var cursorX = 0f
    private var cursorY = 0f
    private var leftDownTime = 0L
    private var rightDownTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val rootLayout = FrameLayout(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
        }
        val aspectContainer = FrameLayout(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
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

        // Lock the box to 16:9.
        val displayMetrics = android.util.DisplayMetrics()
        display.getMetrics(displayMetrics)
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels
        val screenRatio = screenWidth.toFloat() / screenHeight.toFloat()
        val targetRatio = 16f / 9f

        val params = aspectContainer.layoutParams as FrameLayout.LayoutParams
        if (screenRatio > targetRatio) {
            params.height = screenHeight
            params.width = (screenHeight * targetRatio).toInt()
        } else {
            params.width = screenWidth
            params.height = (screenWidth / targetRatio).toInt()
        }
        aspectContainer.layoutParams = params

        webView.post {
            cursorX = webView.width / 2f
            cursorY = webView.height / 2f
            webView.requestFocus()
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

    private fun updateVisualCursor() {
        webView.evaluateJavascript(
            "window.__auroraCursor && window.__auroraCursor.move(${cursorX}, ${cursorY})", null
        )
    }

    /** Moves the cursor by a relative delta. `dragging=true` sends ACTION_MOVE
     *  with the left button held (for window-drag/selection); otherwise it's
     *  a plain hover move. */
    fun moveCursorBy(dx: Float, dy: Float, dragging: Boolean) {
        cursorX = (cursorX + dx).coerceIn(0f, webView.width.toFloat())
        cursorY = (cursorY + dy).coerceIn(0f, webView.height.toFloat())
        webView.post {
            val ev = if (dragging) {
                buildMouseEvent(MotionEvent.ACTION_MOVE, MotionEvent.BUTTON_PRIMARY, leftDownTime)
            } else {
                buildMouseEvent(MotionEvent.ACTION_HOVER_MOVE, 0, SystemClock.uptimeMillis())
            }
            if (dragging) webView.dispatchTouchEvent(ev) else webView.dispatchGenericMotionEvent(ev)
            updateVisualCursor()
        }
    }

    fun pressLeft() {
        leftDownTime = SystemClock.uptimeMillis()
        webView.post {
            webView.dispatchTouchEvent(buildMouseEvent(MotionEvent.ACTION_DOWN, MotionEvent.BUTTON_PRIMARY, leftDownTime))
        }
    }

    fun releaseLeft() {
        webView.post {
            webView.dispatchTouchEvent(buildMouseEvent(MotionEvent.ACTION_UP, 0, leftDownTime))
            webView.evaluateJavascript("window.__auroraCursor && window.__auroraCursor.pulse()", null)
        }
    }

    fun tapClick() {
        pressLeft()
        webView.postDelayed({ releaseLeft() }, 50)
    }

    fun pressRight() {
        rightDownTime = SystemClock.uptimeMillis()
        webView.post {
            webView.dispatchTouchEvent(buildMouseEvent(MotionEvent.ACTION_DOWN, MotionEvent.BUTTON_SECONDARY, rightDownTime))
        }
    }

    fun releaseRight() {
        webView.post {
            webView.dispatchTouchEvent(buildMouseEvent(MotionEvent.ACTION_UP, 0, rightDownTime))
            webView.evaluateJavascript("window.__auroraCursor && window.__auroraCursor.pulse()", null)
        }
    }

    fun tapRightClick() {
        pressRight()
        webView.postDelayed({ releaseRight() }, 50)
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
