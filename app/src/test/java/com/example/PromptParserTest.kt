package com.example

import com.example.parser.PromptParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Rigorous unit tests covering TEST 1 through TEST 8 specified in the project requirements.
 */
class PromptParserTest {

    @Test
    fun test1_directJsonArray() {
        val json = """[ {"part_number":1,"prompt":"A"}, {"part_number":2,"prompt":"B"} ]"""
        val parts = PromptParser.parse(json)
        assertEquals(2, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
        assertTrue(parts[0].fullJson.contains(""""part_number": 1""") || parts[0].fullJson.contains(""""part_number":1"""))
        assertTrue(parts[0].fullJson.contains(""""prompt": "A"""") || parts[0].fullJson.contains(""""prompt":"A""""))
    }

    @Test
    fun test2_rootObjectContainingArray() {
        val json = """{ "prompts":[ {"part_number":1,"prompt":"A"}, {"part_number":2,"prompt":"B"} ] }"""
        val parts = PromptParser.parse(json)
        assertEquals(2, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
    }

    @Test
    fun test3_interleavedChatGptExplanation() {
        val text = """
            Some ChatGPT explanation
            { "part_number": 1, "prompt": "A" }
            More explanation
            { "part_number": 2, "prompt": "B" }
        """.trimIndent()
        val parts = PromptParser.parse(text)
        assertEquals(2, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
    }

    @Test
    fun test4_concatenatedMultipleJsonObjects() {
        val text = """
            {
             "part_number":1,
             "prompt":"A"
            }
            {
             "part_number":2,
             "prompt":"B"
            }
        """.trimIndent()
        val parts = PromptParser.parse(text)
        assertEquals(2, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
    }

    @Test
    fun test5_bracketsInsideStringsMustNotBreak() {
        val text = """{ "part_number":1, "prompt":"Character sees {something} and says \"hello\"." }"""
        val parts = PromptParser.parse(text)
        assertEquals(1, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertTrue(parts[0].fullJson.contains("{something}"))
    }

    @Test
    fun test6_nestedObjectsMustNotBeExtractedAsSeparateParts() {
        val text = """
            {
              "parts": [
                {
                  "part_number": 1,
                  "opening_state": "sunny field",
                  "timed_visual_beats": [
                    {"time": "0-2", "visual": "birds flying"},
                    {"time": "2-5", "visual": "river flowing"}
                  ],
                  "negative_prompt": "blurry, low quality"
                }
              ]
            }
        """.trimIndent()
        val parts = PromptParser.parse(text)
        assertEquals(1, parts.size)
        assertEquals(1, parts[0].partNumber)
        // Complete JSON preserves all nested fields
        assertTrue(parts[0].fullJson.contains("timed_visual_beats"))
        assertTrue(parts[0].fullJson.contains("negative_prompt"))
        assertTrue(parts[0].fullJson.contains("birds flying"))
    }

    @Test
    fun test7_eighteenValidPromptObjects() {
        val sb = StringBuilder()
        sb.append("[\n")
        for (i in 1..18) {
            sb.append("""  {"part_number": $i, "scene_title": "Scene $i", "prompt": "Video prompt $i"}""")
            if (i < 18) sb.append(",\n") else sb.append("\n")
        }
        sb.append("]")

        val parts = PromptParser.parse(sb.toString())
        assertEquals(18, parts.size)
        for (i in 1..18) {
            assertEquals(i, parts[i - 1].partNumber)
            assertEquals("Scene $i", parts[i - 1].title)
        }
    }

    @Test
    fun test8_noPartNumberFieldAssignsSequentialOrder() {
        val json = """
            [
              {"prompt": "First beat without part number"},
              {"prompt": "Second beat without part number"},
              {"prompt": "Third beat without part number"}
            ]
        """.trimIndent()
        val parts = PromptParser.parse(json)
        assertEquals(3, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
        assertEquals(3, parts[2].partNumber)
    }

    @Test
    fun testMarkdownCodeFences() {
        val markdown = """
            Here are the prompts for your video:
            ```json
            [
              {"part_number": 1, "prompt": "Intro scene"},
              {"part_number": 2, "prompt": "Climax scene"}
            ]
            ```
            Hope this helps!
        """.trimIndent()
        val parts = PromptParser.parse(markdown)
        assertEquals(2, parts.size)
        assertEquals(1, parts[0].partNumber)
        assertEquals(2, parts[1].partNumber)
    }
}
