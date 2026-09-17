package com.example.storage

import android.content.Context
import com.example.model.PromptPart
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Handles fast, local, thread-safe persistence of parsed prompts.
 * Prompts are saved in the app's private files directory so they survive
 * app kills, IME recreations, system reboots, and orientation changes.
 */
class PromptStorage(private val context: Context) {

    private val storageFile: File
        get() = File(context.filesDir, "active_prompts.json")

    fun savePrompts(parts: List<PromptPart>) {
        try {
            val jsonArray = JSONArray()
            for (part in parts) {
                val obj = JSONObject()
                obj.put("partNumber", part.partNumber)
                obj.put("originalIndex", part.originalIndex)
                obj.put("fullJson", part.fullJson)
                if (part.title != null) {
                    obj.put("title", part.title)
                }
                jsonArray.put(obj)
            }
            val tempFile = File(context.filesDir, "active_prompts.tmp")
            tempFile.writeText(jsonArray.toString())
            tempFile.renameTo(storageFile)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun loadPrompts(): List<PromptPart> {
        val file = storageFile
        if (!file.exists() || file.length() == 0L) {
            return emptyList()
        }
        return try {
            val content = file.readText()
            val jsonArray = JSONArray(content)
            val list = mutableListOf<PromptPart>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(
                    PromptPart(
                        partNumber = obj.optInt("partNumber", i + 1),
                        originalIndex = obj.optInt("originalIndex", i),
                        fullJson = obj.getString("fullJson"),
                        title = if (obj.has("title")) obj.optString("title") else null
                    )
                )
            }
            list
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    fun clearPrompts() {
        try {
            if (storageFile.exists()) {
                storageFile.delete()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
