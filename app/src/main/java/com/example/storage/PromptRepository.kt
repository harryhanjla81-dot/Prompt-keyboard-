package com.example.storage

import android.content.Context
import com.example.model.PromptPart
import com.example.parser.PromptParser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.InputStream

/**
 * Singleton repository coordinating active prompt parts and storage persistence.
 */
class PromptRepository private constructor(context: Context) {

    private val storage = PromptStorage(context.applicationContext)
    private val _prompts = MutableStateFlow<List<PromptPart>>(emptyList())
    val prompts: StateFlow<List<PromptPart>> = _prompts.asStateFlow()

    init {
        // Load initial prompts from local disk
        _prompts.value = storage.loadPrompts()
    }

    fun loadFromStream(inputStream: InputStream): Result<Int> {
        return try {
            val content = inputStream.bufferedReader().use { it.readText() }
            val parsed = PromptParser.parse(content)
            if (parsed.isEmpty()) {
                Result.failure(Exception("No prompts found in this file."))
            } else {
                setPrompts(parsed)
                Result.success(parsed.size)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun loadFromText(text: String): Result<Int> {
        return try {
            val parsed = PromptParser.parse(text)
            if (parsed.isEmpty()) {
                Result.failure(Exception("No prompts found in this file."))
            } else {
                setPrompts(parsed)
                Result.success(parsed.size)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setPrompts(newPrompts: List<PromptPart>) {
        _prompts.value = newPrompts
        storage.savePrompts(newPrompts)
    }

    fun clearPrompts() {
        _prompts.value = emptyList()
        storage.clearPrompts()
    }

    fun getPrompts(): List<PromptPart> = _prompts.value

    companion object {
        @Volatile
        private var INSTANCE: PromptRepository? = null

        fun getInstance(context: Context): PromptRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: PromptRepository(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
