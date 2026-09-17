package com.example.parser

import com.example.model.PromptPart
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/**
 * Robust, layered JSON prompt parser designed for arbitrary prompt schemas.
 *
 * Implements:
 * - Layer 1: Direct JSON array root
 * - Layer 2: Root object containing known list keys ("prompts", "parts", "scenes", etc.)
 * - Layer 3: Balanced-bracket state machine for streaming/interleaved JSON objects
 * - Layer 4: Markdown code-fence block detection (```json ... ```)
 * - Layer 5: Deterministic part number extraction with sequential fallback
 *
 * Preserves the COMPLETE JSON object for every part.
 */
object PromptParser {

    private val KNOWN_ARRAY_KEYS = listOf(
        "prompts", "parts", "scenes", "beats", "items", "data", "list", "content"
    )

    private val PART_NUMBER_KEYS = listOf(
        "part_number", "partNumber", "part", "scene_number", "sceneNumber", "scene", "index", "id"
    )

    /**
     * Parses the given text and returns a list of [PromptPart].
     * Never throws an exception; returns an empty list on invalid input.
     */
    fun parse(rawText: String?): List<PromptPart> {
        if (rawText.isNullOrBlank()) return emptyList()

        // Step 1: Clean BOM and leading/trailing whitespace
        val cleanText = sanitizeText(rawText)
        if (cleanText.isEmpty()) return emptyList()

        // Step 2: Try Layer 1 (Direct JSON Array) or Layer 2 (Object with Array)
        val directResults = tryDirectJsonParse(cleanText)
        if (directResults.isNotEmpty()) {
            return directResults
        }

        // Step 3: Try Layer 4 (Markdown Fenced JSON)
        val fencedResults = tryMarkdownFencedParse(cleanText)
        if (fencedResults.isNotEmpty()) {
            return fencedResults
        }

        // Step 4: Try Layer 3 (Balanced JSON Object State Machine)
        val balancedResults = tryBalancedObjectExtraction(cleanText)
        if (balancedResults.isNotEmpty()) {
            return balancedResults
        }

        return emptyList()
    }

    private fun sanitizeText(input: String): String {
        var text = input
        // Strip UTF-8 BOM if present
        if (text.startsWith("\uFEFF")) {
            text = text.substring(1)
        }
        return text.trim()
    }

    /**
     * Layer 1 & Layer 2: Direct JSON parsing via standard org.json
     */
    private fun tryDirectJsonParse(text: String): List<PromptPart> {
        return try {
            val tokener = JSONTokener(text)
            val nextValue = tokener.nextValue()

            when (nextValue) {
                is JSONArray -> parseJsonArray(nextValue)
                is JSONObject -> {
                    // Check known array keys
                    for (key in KNOWN_ARRAY_KEYS) {
                        if (nextValue.has(key)) {
                            val array = nextValue.optJSONArray(key)
                            if (array != null && array.length() > 0) {
                                return parseJsonArray(array)
                            }
                        }
                    }
                    // If no known array key matched, check if any value in the object is a JSONArray
                    val keys = nextValue.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        val array = nextValue.optJSONArray(key)
                        if (array != null && array.length() > 0) {
                            return parseJsonArray(array)
                        }
                    }
                    // If it's a single standalone prompt object
                    if (isPromptCandidate(nextValue)) {
                        listOf(buildPromptPart(nextValue, 0, 1))
                    } else {
                        emptyList()
                    }
                }
                else -> emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /**
     * Layer 4: Markdown code-fence block detection (```json ... ```)
     */
    private fun tryMarkdownFencedParse(text: String): List<PromptPart> {
        val fenceRegex = Regex("```(?:json)?\\s*([\\s\\S]*?)\\s*```", RegexOption.IGNORE_CASE)
        val matches = fenceRegex.findAll(text).toList()
        if (matches.isEmpty()) return emptyList()

        val collectedParts = mutableListOf<PromptPart>()
        for (match in matches) {
            val blockContent = match.groupValues[1].trim()
            if (blockContent.isNotEmpty()) {
                val direct = tryDirectJsonParse(blockContent)
                if (direct.isNotEmpty()) {
                    collectedParts.addAll(direct)
                } else {
                    val balanced = tryBalancedObjectExtraction(blockContent)
                    if (balanced.isNotEmpty()) {
                        collectedParts.addAll(balanced)
                    }
                }
            }
        }

        return if (collectedParts.isNotEmpty()) {
            normalizePartNumbers(collectedParts)
        } else {
            emptyList()
        }
    }

    /**
     * Layer 3: Balanced-bracket state machine for extracting top-level JSON objects.
     * Accurately ignores brackets inside strings and accounts for escaped characters.
     */
    private fun tryBalancedObjectExtraction(text: String): List<PromptPart> {
        val candidates = mutableListOf<String>()
        var depth = 0
        var insideString = false
        var escapeNext = false
        var startIndex = -1

        for (i in text.indices) {
            val c = text[i]

            if (escapeNext) {
                escapeNext = false
                continue
            }

            if (c == '\\') {
                if (insideString) {
                    escapeNext = true
                }
                continue
            }

            if (c == '"') {
                insideString = !insideString
                continue
            }

            if (!insideString) {
                if (c == '{') {
                    if (depth == 0) {
                        startIndex = i
                    }
                    depth++
                } else if (c == '}') {
                    depth--
                    if (depth == 0 && startIndex != -1) {
                        val candidateJson = text.substring(startIndex, i + 1).trim()
                        candidates.add(candidateJson)
                        startIndex = -1
                    } else if (depth < 0) {
                        // Recover from mismatched closing bracket
                        depth = 0
                        startIndex = -1
                    }
                }
            }
        }

        val parts = mutableListOf<PromptPart>()
        var originalIndex = 0

        for (candidate in candidates) {
            try {
                val jsonObject = JSONObject(candidate)
                // Filter out non-prompt internal fragments
                if (isPromptCandidate(jsonObject)) {
                    val partNum = extractPartNumber(jsonObject) ?: (originalIndex + 1)
                    val title = extractTitle(jsonObject)
                    val prettyJson = formatJsonObject(jsonObject)
                    parts.add(
                        PromptPart(
                            partNumber = partNum,
                            originalIndex = originalIndex,
                            fullJson = prettyJson,
                            title = title
                        )
                    )
                    originalIndex++
                }
            } catch (_: Exception) {
                // Ignore invalid candidates safely
            }
        }

        return normalizePartNumbers(parts)
    }

    private fun parseJsonArray(array: JSONArray): List<PromptPart> {
        val parts = mutableListOf<PromptPart>()
        for (i in 0 until array.length()) {
            val element = array.opt(i)
            if (element is JSONObject) {
                val partNum = extractPartNumber(element) ?: (i + 1)
                val title = extractTitle(element)
                val prettyJson = formatJsonObject(element)
                parts.add(
                    PromptPart(
                        partNumber = partNum,
                        originalIndex = i,
                        fullJson = prettyJson,
                        title = title
                    )
                )
            }
        }
        return normalizePartNumbers(parts)
    }

    private fun isPromptCandidate(obj: JSONObject): Boolean {
        // Must have at least one key
        if (obj.length() == 0) return false
        // Any object that has a prompt, part number, scene, description, or content
        return true
    }

    private fun extractPartNumber(obj: JSONObject): Int? {
        for (key in PART_NUMBER_KEYS) {
            if (obj.has(key)) {
                val value = obj.opt(key)
                when (value) {
                    is Number -> return value.toInt()
                    is String -> {
                        // Support string like "1", "Part 1", "#1"
                        val digits = value.filter { it.isDigit() }
                        if (digits.isNotEmpty()) {
                            return digits.toIntOrNull()
                        }
                    }
                }
            }
        }
        return null
    }

    private fun extractTitle(obj: JSONObject): String? {
        val titleKeys = listOf("scene_title", "sceneTitle", "title", "name", "story_beat", "label")
        for (key in titleKeys) {
            if (obj.has(key)) {
                val value = obj.optString(key)
                if (value.isNotBlank()) return value
            }
        }
        return null
    }

    private fun buildPromptPart(obj: JSONObject, index: Int, fallbackNumber: Int): PromptPart {
        val partNum = extractPartNumber(obj) ?: fallbackNumber
        val title = extractTitle(obj)
        val prettyJson = formatJsonObject(obj)
        return PromptPart(
            partNumber = partNum,
            originalIndex = index,
            fullJson = prettyJson,
            title = title
        )
    }

    private fun formatJsonObject(obj: JSONObject): String {
        return try {
            obj.toString(2)
        } catch (_: Exception) {
            obj.toString()
        }
    }

    /**
     * Ensures part numbers are distinct and sequential if duplicates exist,
     * while preserving the original order.
     */
    private fun normalizePartNumbers(parts: List<PromptPart>): List<PromptPart> {
        if (parts.isEmpty()) return emptyList()

        val partNumbers = parts.map { it.partNumber }
        val hasDuplicates = partNumbers.distinct().size != parts.size
        val hasNonPositive = partNumbers.any { it <= 0 }

        if (!hasDuplicates && !hasNonPositive) {
            return parts
        }

        // Renumber sequentially 1..N if duplicates or invalid numbers found
        return parts.mapIndexed { index, part ->
            part.copy(partNumber = index + 1)
        }
    }
}
