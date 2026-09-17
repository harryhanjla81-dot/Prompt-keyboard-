package com.example.model

/**
 * Represents a single parsed prompt part from an imported JSON file.
 *
 * @property partNumber The resolved part number (e.g., 1, 2, 3...)
 * @property originalIndex The original 0-based position in the source document
 * @property fullJson The complete, unsummarized JSON representation of this part
 * @property title Optional human-readable title or preview label
 */
data class PromptPart(
    val partNumber: Int,
    val originalIndex: Int,
    val fullJson: String,
    val title: String? = null
)
