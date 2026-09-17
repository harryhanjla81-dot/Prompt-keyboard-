package com.example.keyboard

import android.content.Context
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.example.R

/**
 * Handles building and rendering responsive QWERTY and Symbol keyboard rows
 * with soft glass aesthetic, proportional key sizing, and touch feedback.
 */
class KeyboardLayoutHelper(
    private val context: Context,
    private val listener: KeyActionListener
) {

    interface KeyActionListener {
        fun onCharacter(char: String)
        fun onBackspace()
        fun onBackspaceLongHoldStart()
        fun onBackspaceLongHoldEnd()
        fun onSpace()
        fun onEnter()
        fun onShiftToggle()
        fun onSymbolsToggle()
    }

    private val qwertyRow1 = listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p")
    private val qwertyRow2 = listOf("a", "s", "d", "f", "g", "h", "j", "k", "l")
    private val qwertyRow3 = listOf("z", "x", "c", "v", "b", "n", "m")

    private val symbolsRow1 = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
    private val symbolsRow2 = listOf("@", "#", "$", "%", "&", "-", "+", "(", ")", "/")
    private val symbolsRow3 = listOf("=", "<", ">", "*", "\"", "'", ":", ";", "!", "?")

    fun buildRows(
        row1: LinearLayout,
        row2: LinearLayout,
        row3: LinearLayout,
        row4: LinearLayout,
        isShifted: Boolean,
        isSymbols: Boolean
    ) {
        row1.removeAllViews()
        row2.removeAllViews()
        row3.removeAllViews()
        row4.removeAllViews()

        if (!isSymbols) {
            // QWERTY Layout
            buildCharacterRow(row1, qwertyRow1, isShifted)
            buildIndentedRow(row2, qwertyRow2, isShifted)
            buildQwertyRow3(row3, qwertyRow3, isShifted)
            buildBottomRow(row4, isSymbols = false)
        } else {
            // Symbols / Numbers Layout
            buildCharacterRow(row1, symbolsRow1, false)
            buildCharacterRow(row2, symbolsRow2, false)
            buildSymbolsRow3(row3, symbolsRow3)
            buildBottomRow(row4, isSymbols = true)
        }
    }

    private fun buildCharacterRow(parent: LinearLayout, keys: List<String>, isShifted: Boolean) {
        for (key in keys) {
            val label = if (isShifted) key.uppercase() else key
            val keyView = createKeyView(label, weight = 1.0f) {
                listener.onCharacter(label)
            }
            parent.addView(keyView)
        }
    }

    private fun buildIndentedRow(parent: LinearLayout, keys: List<String>, isShifted: Boolean) {
        // Half-key spacer at start
        parent.addView(createSpacer(weight = 0.5f))

        for (key in keys) {
            val label = if (isShifted) key.uppercase() else key
            val keyView = createKeyView(label, weight = 1.0f) {
                listener.onCharacter(label)
            }
            parent.addView(keyView)
        }

        // Half-key spacer at end
        parent.addView(createSpacer(weight = 0.5f))
    }

    private fun buildQwertyRow3(parent: LinearLayout, keys: List<String>, isShifted: Boolean) {
        // Shift Key (weight 1.5)
        val shiftView = createIconKeyView(
            iconRes = if (isShifted) R.drawable.ic_shift_active else R.drawable.ic_shift,
            weight = 1.5f,
            isSpecial = true
        ) {
            listener.onShiftToggle()
        }
        parent.addView(shiftView)

        for (key in keys) {
            val label = if (isShifted) key.uppercase() else key
            val keyView = createKeyView(label, weight = 1.0f) {
                listener.onCharacter(label)
            }
            parent.addView(keyView)
        }

        // Backspace Key (weight 1.5) with repeating deletion
        val backspaceView = createBackspaceKeyView(weight = 1.5f)
        parent.addView(backspaceView)
    }

    private fun buildSymbolsRow3(parent: LinearLayout, keys: List<String>) {
        // More symbols / Shift placeholder (weight 1.2)
        val extraView = createKeyView("~#{", weight = 1.2f, isSpecial = true) {
            // Cycles or stays in symbols
        }
        parent.addView(extraView)

        for (key in keys) {
            val keyView = createKeyView(key, weight = 1.0f) {
                listener.onCharacter(key)
            }
            parent.addView(keyView)
        }

        // Backspace Key (weight 1.2)
        val backspaceView = createBackspaceKeyView(weight = 1.2f)
        parent.addView(backspaceView)
    }

    private fun buildBottomRow(parent: LinearLayout, isSymbols: Boolean) {
        // Switch Layout Key (?123 or ABC)
        val toggleLabel = if (isSymbols) "ABC" else "?123"
        val toggleKey = createKeyView(toggleLabel, weight = 1.4f, isSpecial = true) {
            listener.onSymbolsToggle()
        }
        parent.addView(toggleKey)

        // Comma or Emoji Key
        val commaKey = createKeyView(",", weight = 1.0f) {
            listener.onCharacter(",")
        }
        parent.addView(commaKey)

        // Spacebar Key (wide weight 4.2)
        val spaceKey = createKeyView("Space", weight = 4.2f, isSpecial = false) {
            listener.onSpace()
        }
        parent.addView(spaceKey)

        // Period Key
        val periodKey = createKeyView(".", weight = 1.0f) {
            listener.onCharacter(".")
        }
        parent.addView(periodKey)

        // Enter Key (accent background, weight 1.5)
        val enterKey = createEnterKeyView(weight = 1.5f) {
            listener.onEnter()
        }
        parent.addView(enterKey)
    }

    private fun createKeyView(
        label: String,
        weight: Float,
        isSpecial: Boolean = false,
        onClick: () -> Unit
    ): View {
        val textView = TextView(context).apply {
            text = label
            gravity = Gravity.CENTER
            setTextColor(0xFFFFFFFF.toInt())
            setTextSize(TypedValue.COMPLEX_UNIT_SP, if (label.length > 2) 13f else 18f)
            setTypeface(Typeface.SANS_SERIF, if (label.length > 2) Typeface.BOLD else Typeface.NORMAL)
            background = ContextCompat.getDrawable(
                context,
                if (isSpecial) R.drawable.key_special_background else R.drawable.key_background
            )
            isClickable = true
            isFocusable = true

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                onClick()
            }
        }

        val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight).apply {
            setMargins(dpToPx(2), dpToPx(3), dpToPx(2), dpToPx(3))
        }
        textView.layoutParams = params
        return textView
    }

    private fun createIconKeyView(
        iconRes: Int,
        weight: Float,
        isSpecial: Boolean = true,
        onClick: () -> Unit
    ): View {
        val imageView = ImageView(context).apply {
            setImageResource(iconRes)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            background = ContextCompat.getDrawable(
                context,
                if (isSpecial) R.drawable.key_special_background else R.drawable.key_background
            )
            isClickable = true
            isFocusable = true

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                onClick()
            }
        }

        val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight).apply {
            setMargins(dpToPx(2), dpToPx(3), dpToPx(2), dpToPx(3))
        }
        imageView.layoutParams = params
        return imageView
    }

    private fun createEnterKeyView(weight: Float, onClick: () -> Unit): View {
        val imageView = ImageView(context).apply {
            setImageResource(R.drawable.ic_enter)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            background = ContextCompat.getDrawable(context, R.drawable.key_action_background)
            isClickable = true
            isFocusable = true

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                onClick()
            }
        }

        val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight).apply {
            setMargins(dpToPx(2), dpToPx(3), dpToPx(2), dpToPx(3))
        }
        imageView.layoutParams = params
        return imageView
    }

    private fun createBackspaceKeyView(weight: Float): View {
        val imageView = ImageView(context).apply {
            setImageResource(R.drawable.ic_backspace)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            background = ContextCompat.getDrawable(context, R.drawable.key_special_background)
            isClickable = true
            isFocusable = true

            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                listener.onBackspace()
            }

            setOnTouchListener { v, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        v.isPressed = true
                        listener.onBackspaceLongHoldStart()
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        v.isPressed = false
                        listener.onBackspaceLongHoldEnd()
                    }
                }
                false // allow onClick to also trigger on normal tap
            }
        }

        val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight).apply {
            setMargins(dpToPx(2), dpToPx(3), dpToPx(2), dpToPx(3))
        }
        imageView.layoutParams = params
        return imageView
    }

    private fun createSpacer(weight: Float): View {
        val view = View(context)
        val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight)
        view.layoutParams = params
        return view
    }

    private fun dpToPx(dp: Int): Int {
        val metrics = context.resources.displayMetrics
        return (dp * metrics.density).toInt()
    }
}
