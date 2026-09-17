# Prompt Keyboard for Android

A production-ready Android Custom System Keyboard (InputMethodService / IME) featuring:
- **Translucent Glass UI**: Deep dark slate/indigo gradient backdrop, semi-transparent rounded rectangular keys, centered crisp white labels, and responsive proportional key sizing.
- **Full System IME Support**: Works across WhatsApp, Chrome, ChatGPT, YouTube, Notes, Instagram, and any text field in Android.
- **Layered JSON Prompt Parser**: Automatically parses and detects 1 to 50+ prompt parts from uploaded JSON documents, preserving complete unsummarized JSON objects with all nested fields.
- **One-Tap "Use Part X" Injection**: Directly injects the complete JSON object into the currently active input field via `InputConnection.commitText()`.
- **Clipboard Tab**: View and insert copied clips in compliance with Android privacy guidelines.
- **Fully Offline & Privacy Focused**: Zero internet permissions, zero telemetry, local persistence.

---

## Features & Visual Design

### 1. Normal Keyboard UI
- Full QWERTY layout with automatic uppercase toggle on Shift.
- Repeating deletion on long-holding Backspace.
- Editor action awareness (Search, Go, Done, Send, or newline).
- Symbol and number layout (?123 / ABC).
- Quick emoji toolbar strip (`😊`, `😂`, `❤️`, `🔥`, `👍`, `✨`, etc.).
- Proportional key weights and touch feedback.

### 2. Prompt Tab
- Header displays loaded prompt count badge (e.g. `18`).
- When empty: displays `"No prompts loaded"` with `[ Upload JSON File ]` button.
- When loaded: vertically scrollable list of cards:
  ```
  Part 1          [ Use Part 1 ]
  Part 2          [ Use Part 2 ]
  Part 3          [ Use Part 3 ]
  ...
  Part 18         [ Use Part 18 ]
  ```
- Tapping `[ Use Part X ]` directly commits the **complete** JSON of Part X into the active application's current input field without losing any nested fields.

### 3. Layered JSON Parser
Supports multiple arbitrary structures:
1. **Direct JSON Array**: `[ {"part_number": 1, ...}, {"part_number": 2, ...} ]`
2. **Root Object with Array**: `{ "prompts": [ ... ] }` or `{ "parts": [ ... ] }`
3. **Interleaved Text / Balanced Brackets**: Extracts individual top-level `{ ... }` blocks even when surrounded by text, properly respecting strings and escaped quotes.
4. **Markdown Fenced Blocks**: Detects and parses ```` ```json ... ``` ````.
5. **Deterministic Part Numbering**: Checks `part_number`, `part`, `scene_number`, `scene`, or assigns sequential 1..N order.

---

## How to Build and Run in Android Studio

1. **Open the Project**:
   - Open Android Studio (Ladybug or newer).
   - Select **Open** and choose this project root folder.
   - Wait for Gradle sync to finish.

2. **Run on Device or Emulator**:
   - Connect an Android device (Android 7.0 / API 24 or newer) or launch an Android Virtual Device (AVD).
   - Click the green **Run** button (or press `Shift + F10`).

3. **Enable and Select Prompt Keyboard**:
   - On first launch, the setup screen opens:
     - Tap **Step 1: Enable in Settings** -> Toggle on **Prompt Keyboard** in System Keyboard Settings.
     - Tap **Step 2: Switch Input Method** -> Select **Prompt Keyboard**.
   - Test typing directly in the on-screen test field!

4. **Upload JSON Prompts**:
   - Tap **Upload JSON File** in the setup screen or tap the **Prompt icon** in the keyboard toolbar.
   - Choose any `.json` file containing prompts or parts.
   - The parts will immediately appear as `Part 1 [Use Part 1]`, `Part 2 [Use Part 2]`, etc.

---

## Running Unit Tests

Run the parser unit tests covering Test Cases 1 through 8:
```bash
./gradlew testDebugUnitTest
```
All tests verify array parsing, nested object preservation, string bracket balancing, and sequential part indexing.
