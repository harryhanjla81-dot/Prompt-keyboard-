package com.example.clipboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context

/**
 * Handles reading from and interacting with Android's system clipboard.
 * Complies with Android privacy restrictions (Android 10+ background restrictions,
 * Android 12+ clipboard access notifications, Android 13+ toast controls).
 */
class ClipboardController(private val context: Context) {

    private val clipboardManager =
        context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager

    /**
     * Retrieves currently available primary clip text from system clipboard.
     * Degrades gracefully if clipboard is empty or restricted by OS.
     */
    fun getPrimaryClipText(): String? {
        return try {
            val clip = clipboardManager?.primaryClip
            if (clip != null && clip.itemCount > 0) {
                clip.getItemAt(0)?.coerceToText(context)?.toString()?.takeIf { it.isNotBlank() }
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Copies text to system clipboard.
     */
    fun copyToClipboard(label: String, text: String) {
        try {
            val clip = ClipData.newPlainText(label, text)
            clipboardManager?.setPrimaryClip(clip)
        } catch (_: Exception) {
        }
    }
}
