package com.example.keyboard

import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.example.MainActivity
import com.example.R
import com.example.clipboard.ClipboardController
import com.example.model.PromptPart
import com.example.storage.PromptRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Real Android System Keyboard (IME) implemented via InputMethodService.
 *
 * Features:
 * - Visually styled after translucent reference design
 * - QWERTY and Symbols layout with responsive key sizing
 * - Quick emoji toolbar strip
 * - Prompts Tab with JSON prompt parts list and one-tap "Use Part X" direct injection
 * - Clipboard Tab for accessing and inserting copied clips
 * - Non-crashing null-safe InputConnection handling
 */
class CustomKeyboardService : InputMethodService(), KeyboardLayoutHelper.KeyActionListener {

    enum class PanelState {
        KEYBOARD,
        PROMPTS,
        CLIPBOARD
    }

    private var currentPanel = PanelState.KEYBOARD
    private var isShifted = false
    private var isSymbols = false

    private lateinit var layoutHelper: KeyboardLayoutHelper
    private lateinit var clipboardController: ClipboardController
    private lateinit var promptRepository: PromptRepository

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private val handler = Handler(Looper.getMainLooper())
    private var backspaceRepeatRunnable: Runnable? = null

    // UI View References
    private var rootView: View? = null
    private var layoutKeyboardKeys: LinearLayout? = null
    private var layoutPromptsPanel: LinearLayout? = null
    private var layoutClipboardPanel: LinearLayout? = null

    private var row1: LinearLayout? = null
    private var row2: LinearLayout? = null
    private var row3: LinearLayout? = null
    private var row4: LinearLayout? = null

    private var tvPromptBadge: TextView? = null
    private var layoutPromptsEmpty: LinearLayout? = null
    private var scrollPromptsList: ScrollView? = null
    private var containerPromptItems: LinearLayout? = null

    private var tvClipboardPreview: TextView? = null
    private var layoutClipboardContent: LinearLayout? = null
    private var layoutClipboardEmpty: LinearLayout? = null

    private val quickEmojis = listOf("😊", "😂", "❤️", "🔥", "👍", "✨", "🙏", "🚀", "💬", "💯", "🎯", "👏", "🎉", "💡")

    override fun onCreate() {
        super.onCreate()
        layoutHelper = KeyboardLayoutHelper(this, this)
        clipboardController = ClipboardController(this)
        promptRepository = PromptRepository.getInstance(this)
    }

    override fun onCreateInputView(): View {
        val inflater = LayoutInflater.from(this)
        val view = inflater.inflate(R.layout.keyboard_view, null)
        rootView = view

        initViewReferences(view)
        setupToolbar(view)
        setupQuickEmojis(view)
        setupPromptsPanel(view)
        setupClipboardPanel(view)

        refreshKeyboardLayout()
        observePrompts()

        return view
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        // Default to normal keyboard on start
        showPanel(PanelState.KEYBOARD)
    }

    private fun initViewReferences(view: View) {
        layoutKeyboardKeys = view.findViewById(R.id.layout_keyboard_keys)
        layoutPromptsPanel = view.findViewById(R.id.layout_prompts_panel)
        layoutClipboardPanel = view.findViewById(R.id.layout_clipboard_panel)

        row1 = view.findViewById(R.id.row_1)
        row2 = view.findViewById(R.id.row_2)
        row3 = view.findViewById(R.id.row_3)
        row4 = view.findViewById(R.id.row_4)

        tvPromptBadge = view.findViewById(R.id.tv_prompt_badge)
        layoutPromptsEmpty = view.findViewById(R.id.layout_prompts_empty)
        scrollPromptsList = view.findViewById(R.id.scroll_prompts_list)
        containerPromptItems = view.findViewById(R.id.container_prompt_items)

        tvClipboardPreview = view.findViewById(R.id.tv_clipboard_preview)
        layoutClipboardContent = view.findViewById(R.id.layout_clipboard_content)
        layoutClipboardEmpty = view.findViewById(R.id.layout_clipboard_empty)
    }

    private fun setupToolbar(view: View) {
        view.findViewById<ImageButton>(R.id.btn_toolbar_keyboard).setOnClickListener {
            showPanel(PanelState.KEYBOARD)
        }

        view.findViewById<ImageButton>(R.id.btn_toolbar_clipboard).setOnClickListener {
            loadClipboardContent()
            showPanel(PanelState.CLIPBOARD)
        }

        view.findViewById<LinearLayout>(R.id.btn_toolbar_prompts).setOnClickListener {
            showPanel(PanelState.PROMPTS)
        }

        view.findViewById<ImageButton>(R.id.btn_toolbar_hide).setOnClickListener {
            requestHideSelf(0)
        }
    }

    private fun setupQuickEmojis(view: View) {
        val strip = view.findViewById<LinearLayout>(R.id.emoji_strip)
        strip.removeAllViews()

        for (emoji in quickEmojis) {
            val emojiButton = TextView(this).apply {
                text = emoji
                textSize = 18f
                setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2))
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    currentInputConnection?.commitText(emoji, 1)
                }
            }
            strip.addView(emojiButton)
        }
    }

    private fun setupPromptsPanel(view: View) {
        view.findViewById<TextView>(R.id.btn_prompt_close).setOnClickListener {
            showPanel(PanelState.KEYBOARD)
        }

        view.findViewById<TextView>(R.id.btn_prompt_header_upload).setOnClickListener {
            openFilePickerActivity()
        }

        view.findViewById<Button>(R.id.btn_upload_json_empty).setOnClickListener {
            openFilePickerActivity()
        }
    }

    private fun setupClipboardPanel(view: View) {
        view.findViewById<TextView>(R.id.btn_clipboard_close).setOnClickListener {
            showPanel(PanelState.KEYBOARD)
        }

        view.findViewById<View>(R.id.card_clipboard_item).setOnClickListener {
            val text = tvClipboardPreview?.text?.toString()
            if (!text.isNullOrEmpty()) {
                currentInputConnection?.commitText(text, 1)
                showPanel(PanelState.KEYBOARD)
            }
        }
    }

    private fun showPanel(state: PanelState) {
        currentPanel = state
        layoutKeyboardKeys?.visibility = if (state == PanelState.KEYBOARD) View.VISIBLE else View.GONE
        layoutPromptsPanel?.visibility = if (state == PanelState.PROMPTS) View.VISIBLE else View.GONE
        layoutClipboardPanel?.visibility = if (state == PanelState.CLIPBOARD) View.VISIBLE else View.GONE
    }

    private fun refreshKeyboardLayout() {
        val r1 = row1 ?: return
        val r2 = row2 ?: return
        val r3 = row3 ?: return
        val r4 = row4 ?: return

        layoutHelper.buildRows(r1, r2, r3, r4, isShifted = isShifted, isSymbols = isSymbols)
    }

    private fun observePrompts() {
        serviceScope.launch {
            promptRepository.prompts.collectLatest { parts ->
                updatePromptsUI(parts)
            }
        }
    }

    private fun updatePromptsUI(parts: List<PromptPart>) {
        tvPromptBadge?.text = parts.size.toString()

        if (parts.isEmpty()) {
            layoutPromptsEmpty?.visibility = View.VISIBLE
            scrollPromptsList?.visibility = View.GONE
            containerPromptItems?.removeAllViews()
        } else {
            layoutPromptsEmpty?.visibility = View.GONE
            scrollPromptsList?.visibility = View.VISIBLE
            populatePromptList(parts)
        }
    }

    private fun populatePromptList(parts: List<PromptPart>) {
        val container = containerPromptItems ?: return
        container.removeAllViews()

        val inflater = LayoutInflater.from(this)
        for (part in parts) {
            val rowView = inflater.inflate(R.layout.item_prompt_row, container, false)
            val label = rowView.findViewById<TextView>(R.id.tv_part_label)
            val subtitle = rowView.findViewById<TextView>(R.id.tv_part_subtitle)
            val btnUse = rowView.findViewById<TextView>(R.id.btn_use_part)

            label.text = "Part ${part.partNumber}"
            if (!part.title.isNullOrBlank()) {
                subtitle.visibility = View.VISIBLE
                subtitle.text = part.title
            } else {
                subtitle.visibility = View.GONE
            }

            btnUse.text = "Use Part ${part.partNumber}"
            btnUse.setOnClickListener {
                insertPromptDirectly(part)
            }

            container.addView(rowView)
        }
    }

    /**
     * Inserts the COMPLETE JSON object for the given prompt part into the active field.
     * Uses safe chunked insertion for very large JSON bodies to ensure reliability across all apps.
     */
    private fun insertPromptDirectly(part: PromptPart) {
        val ic = currentInputConnection
        if (ic == null) {
            Toast.makeText(this, "No active text field found", Toast.LENGTH_SHORT).show()
            return
        }

        val jsonToInsert = part.fullJson
        if (jsonToInsert.length <= 2000) {
            ic.commitText(jsonToInsert, 1)
        } else {
            // Safe chunked insertion for huge JSON objects (>2KB)
            val chunkSize = 1000
            var offset = 0
            while (offset < jsonToInsert.length) {
                val end = minOf(offset + chunkSize, jsonToInsert.length)
                val chunk = jsonToInsert.substring(offset, end)
                ic.commitText(chunk, 1)
                offset = end
            }
        }

        Toast.makeText(this, "Inserted Part ${part.partNumber}", Toast.LENGTH_SHORT).show()
    }

    private fun loadClipboardContent() {
        val clipText = clipboardController.getPrimaryClipText()
        if (!clipText.isNullOrBlank()) {
            layoutClipboardContent?.visibility = View.VISIBLE
            layoutClipboardEmpty?.visibility = View.GONE
            tvClipboardPreview?.text = clipText
        } else {
            layoutClipboardContent?.visibility = View.GONE
            layoutClipboardEmpty?.visibility = View.VISIBLE
        }
    }

    private fun openFilePickerActivity() {
        val intent = Intent(this, MainActivity::class.java).apply {
            action = MainActivity.ACTION_OPEN_FILE_PICKER
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
    }

    // KeyActionListener Callbacks
    override fun onCharacter(char: String) {
        currentInputConnection?.commitText(char, 1)
        if (isShifted) {
            // Revert shift after one character like standard keyboards
            isShifted = false
            refreshKeyboardLayout()
        }
    }

    override fun onBackspace() {
        val ic = currentInputConnection ?: return
        val selectedText = ic.getSelectedText(0)
        if (!selectedText.isNullOrEmpty()) {
            ic.commitText("", 1)
        } else {
            ic.deleteSurroundingText(1, 0)
        }
    }

    override fun onBackspaceLongHoldStart() {
        stopBackspaceRepeat()
        backspaceRepeatRunnable = object : Runnable {
            override fun run() {
                onBackspace()
                handler.postDelayed(this, 50)
            }
        }
        // Start repeating after 350ms hold
        handler.postDelayed(backspaceRepeatRunnable!!, 350)
    }

    override fun onBackspaceLongHoldEnd() {
        stopBackspaceRepeat()
    }

    private fun stopBackspaceRepeat() {
        backspaceRepeatRunnable?.let { handler.removeCallbacks(it) }
        backspaceRepeatRunnable = null
    }

    override fun onSpace() {
        currentInputConnection?.commitText(" ", 1)
    }

    override fun onEnter() {
        val ic = currentInputConnection ?: return
        val editorInfo = currentInputEditorInfo
        val imeAction = editorInfo?.imeOptions?.and(EditorInfo.IME_MASK_ACTION) ?: EditorInfo.IME_ACTION_NONE

        if (imeAction != EditorInfo.IME_ACTION_NONE && imeAction != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(imeAction)
        } else {
            ic.commitText("\n", 1)
        }
    }

    override fun onShiftToggle() {
        isShifted = !isShifted
        refreshKeyboardLayout()
    }

    override fun onSymbolsToggle() {
        isSymbols = !isSymbols
        isShifted = false
        refreshKeyboardLayout()
    }

    override fun onDestroy() {
        stopBackspaceRepeat()
        super.onDestroy()
    }

    private fun dpToPx(dp: Int): Int {
        val metrics = resources.displayMetrics
        return (dp * metrics.density).toInt()
    }
}
