import React, { useState, useRef } from 'react';
import {
  Keyboard,
  FileCode2,
  FileUp,
  Trash2,
  CheckCircle,
  Copy,
  ArrowUp,
  Delete,
  Sparkles,
  Smartphone,
  Info,
  CornerDownLeft,
  Settings,
  Check,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Send
} from 'lucide-react';

interface PromptPart {
  partNumber: number;
  originalIndex: number;
  fullJson: string;
  title?: string;
}

// 18 Sample Prompts matching video / generative story beat workflow
const SAMPLE_18_PROMPTS: PromptPart[] = Array.from({ length: 18 }, (_, i) => {
  const partNum = i + 1;
  const sampleObj = {
    part_number: partNum,
    timestamp: `${Math.floor((i * 10) / 60)}:${((i * 10) % 60).toString().padStart(2, '0')}-${Math.floor(((i + 1) * 10) / 60)}:${(((i + 1) * 10) % 60).toString().padStart(2, '0')}`,
    scene_title: `Scene ${partNum}: Story Progression`,
    opening_state: `Atmospheric setting for beat ${partNum}`,
    timed_visual_beats: [
      { time: '0-3s', visual: `Cinematic visual beat for sequence ${partNum}` },
      { time: '3-7s', visual: `Dynamic camera pan following subject in scene ${partNum}` },
      { time: '7-10s', visual: `Dramatic transition beat leading into subsequent scene` }
    ],
    offscreen_narration: {
      voice: 'Narrator',
      text: `Every journey carries weight, and scene ${partNum} reveals another layer of truth.`
    },
    flow_ai_video_generation_prompt: `Hyper-realistic 8k cinematic shot, 35mm lens, moody atmospheric lighting, dramatic depth of field, color graded in deep teal and amber, masterpiece detail.`,
    camera_and_rendering: `Arri Alexa Mini, anamorphic prime lens, 24fps shutter angle 180`,
    music_ambience_and_sound: `Low resonant sub-bass drone with gentle cello crescendo`,
    negative_prompt: `blurry, low quality, oversaturated, deformed, jitter, text artifacts`
  };

  return {
    partNumber: partNum,
    originalIndex: i,
    fullJson: JSON.stringify(sampleObj, null, 2),
    title: sampleObj.scene_title
  };
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'prompts' | 'clipboard'>('keyboard');
  const [prompts, setPrompts] = useState<PromptPart[]>(SAMPLE_18_PROMPTS);
  const [inputText, setInputText] = useState<string>('');
  const [isShifted, setIsShifted] = useState<boolean>(false);
  const [isSymbols, setIsSymbols] = useState<boolean>(false);
  
  // App views: 'setup' (MainActivity.kt), 'chatgpt', 'whatsapp', 'notes'
  const [activeApp, setActiveApp] = useState<'setup' | 'chatgpt' | 'whatsapp' | 'notes'>('setup');
  
  // Simulated Android IME Setup State
  const [isImeEnabled, setIsImeEnabled] = useState<boolean>(true);
  const [isImeActive, setIsImeActive] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showImePickerModal, setShowImePickerModal] = useState<boolean>(false);
  const [showKeyboardInSetup, setShowKeyboardInSetup] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'both' | 'phone' | 'guide'>('both');

  const [clipboardItems, setClipboardItems] = useState<string[]>([
    'https://ai.studio/build',
    'Custom Android IME with complete JSON prompt injection',
    '{"part_number": 1, "prompt": "Cinematic 8k video beat"}'
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedPartPreview, setSelectedPartPreview] = useState<PromptPart | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Keyboard actions
  const insertText = (text: string) => {
    setInputText((prev) => prev + text);
    if (isShifted) setIsShifted(false);
  };

  const handleBackspace = () => {
    setInputText((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleEnter = () => {
    setInputText((prev) => prev + '\n');
  };

  // Use Part X (Complete JSON direct injection)
  const handleUsePart = (part: PromptPart) => {
    setInputText((prev) => {
      const separator = prev.length > 0 && !prev.endsWith('\n') ? '\n\n' : '';
      return prev + separator + part.fullJson;
    });
    showToast(`✓ Part ${part.partNumber} Complete JSON Inserted!`);
  };

  // JSON File Parser
  const parseUploadedJson = (rawContent: string) => {
    try {
      let text = rawContent.trim();
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }

      // 1. Direct JSON Array or Root Object with Array
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          const parts: PromptPart[] = parsed.map((item, idx) => ({
            partNumber: item.part_number || item.part || item.scene_number || idx + 1,
            originalIndex: idx,
            fullJson: JSON.stringify(item, null, 2),
            title: item.scene_title || item.title || item.name
          }));
          if (parts.length > 0) {
            setPrompts(parts);
            showToast(`✓ Loaded ${parts.length} prompt parts`);
            return;
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          const arrayKeys = ['prompts', 'parts', 'scenes', 'items', 'beats', 'data'];
          for (const key of arrayKeys) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
              const parts: PromptPart[] = parsed[key].map((item: any, idx: number) => ({
                partNumber: item.part_number || item.part || item.scene_number || idx + 1,
                originalIndex: idx,
                fullJson: JSON.stringify(item, null, 2),
                title: item.scene_title || item.title || item.name
              }));
              setPrompts(parts);
              showToast(`✓ Loaded ${parts.length} prompt parts`);
              return;
            }
          }
        }
      } catch {
        // Fall through to bracket balancing
      }

      // 2. Balanced Bracket State Machine
      const candidates: string[] = [];
      let depth = 0;
      let insideString = false;
      let escapeNext = false;
      let startIndex = -1;

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (c === '\\') {
          if (insideString) escapeNext = true;
          continue;
        }
        if (c === '"') {
          insideString = !insideString;
          continue;
        }
        if (!insideString) {
          if (c === '{') {
            if (depth === 0) startIndex = i;
            depth++;
          } else if (c === '}') {
            depth--;
            if (depth === 0 && startIndex !== -1) {
              candidates.push(text.substring(startIndex, i + 1).trim());
              startIndex = -1;
            } else if (depth < 0) {
              depth = 0;
              startIndex = -1;
            }
          }
        }
      }

      const extractedParts: PromptPart[] = [];
      candidates.forEach((cand, idx) => {
        try {
          const obj = JSON.parse(cand);
          if (typeof obj === 'object' && obj !== null) {
            extractedParts.push({
              partNumber: obj.part_number || obj.part || obj.scene_number || idx + 1,
              originalIndex: idx,
              fullJson: JSON.stringify(obj, null, 2),
              title: obj.scene_title || obj.title
            });
          }
        } catch {
          // ignore fragments
        }
      });

      if (extractedParts.length > 0) {
        setPrompts(extractedParts);
        showToast(`✓ Extracted ${extractedParts.length} prompt parts`);
      } else {
        showToast('❌ No valid prompts found in this file');
      }
    } catch {
      showToast('❌ Error parsing JSON file');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseUploadedJson(content);
    };
    reader.readAsText(file);
  };

  const quickEmojis = ['😊', '😂', '❤️', '🔥', '👍', '✨', '🙏', '🚀', '💬', '💯', '🎯', '👏'];

  const qwertyRow1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const qwertyRow2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const qwertyRow3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const symbolsRow1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const symbolsRow2 = ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'];
  const symbolsRow3 = ['=', '<', '>', '*', '"', "'", ':', ';', '!', '?'];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#090D16',
      color: '#FFFFFF',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          padding: '10px 22px',
          borderRadius: '24px',
          fontWeight: 700,
          fontSize: '13px',
          zIndex: 9999,
          boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Top Header with Responsive View Selector */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(9, 13, 22, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1E293B',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#2563EB',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Keyboard size={16} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
              Prompt Keyboard
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>
              Android IME Simulator &amp; Setup
            </div>
          </div>
        </div>

        {/* View Mode Toggle Switch */}
        <div style={{
          display: 'flex',
          backgroundColor: '#1E293B',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid #334155'
        }}>
          <button
            onClick={() => setViewMode('phone')}
            style={{
              backgroundColor: viewMode === 'phone' ? '#2563EB' : 'transparent',
              color: viewMode === 'phone' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={13} />
            <span>📱 Phone Screen</span>
          </button>

          <button
            onClick={() => setViewMode('both')}
            style={{
              backgroundColor: viewMode === 'both' ? '#2563EB' : 'transparent',
              color: viewMode === 'both' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} />
            <span>🖥️ Dual View</span>
          </button>

          <button
            onClick={() => setViewMode('guide')}
            style={{
              backgroundColor: viewMode === 'guide' ? '#2563EB' : 'transparent',
              color: viewMode === 'guide' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Settings size={13} />
            <span>📖 Guide &amp; JSON</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '16px 12px',
        gap: '20px',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Left Column: Phone Emulator displaying the Keyboard App / Target Apps */}
        {(viewMode === 'both' || viewMode === 'phone') && (
          <div style={{
            width: viewMode === 'phone' ? '100%' : '390px',
            maxWidth: '420px',
            minWidth: '0',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            {/* Top Bar above phone */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} color="#38BDF8" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Android Phone Screen</span>
              </div>
              <div style={{
                fontSize: '11px',
                backgroundColor: isImeActive ? '#065F46' : '#854D0E',
                color: isImeActive ? '#34D399' : '#FDE047',
                padding: '3px 9px',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isImeActive ? '#34D399' : '#FDE047'
                }} />
                {isImeActive ? 'Prompt Keyboard Active' : 'Default Keyboard'}
              </div>
            </div>

            {/* Android Phone Frame */}
            <div style={{
              height: '740px',
              maxHeight: '90vh',
              width: '100%',
              backgroundColor: '#05070D',
              borderRadius: '34px',
              border: '6px solid #1E293B',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              boxSizing: 'border-box'
            }}>
            {/* Phone Notch / Status Bar */}
            <div style={{
              height: '30px',
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94A3B8'
            }}>
              <span>9:41</span>
              <div style={{
                width: '64px',
                height: '14px',
                backgroundColor: '#000000',
                borderRadius: '10px'
              }} />
              <span>5G 100%</span>
            </div>

            {/* Application Switcher Bar */}
            <div style={{
              backgroundColor: '#1E293B',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #334155',
              gap: '4px'
            }}>
              {/* Setup App Button */}
              <button
                onClick={() => setActiveApp('setup')}
                style={{
                  backgroundColor: activeApp === 'setup' ? '#2563EB' : 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  border: activeApp === 'setup' ? '1px solid #60A5FA' : '1px solid transparent',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Settings size={13} />
                <span>Setup App</span>
                {activeApp === 'setup' && (
                  <span style={{
                    backgroundColor: '#10B981',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%'
                  }} />
                )}
              </button>

              {/* External Target Apps */}
              <div style={{ display: 'flex', gap: '3px' }}>
                <button
                  onClick={() => setActiveApp('chatgpt')}
                  style={{
                    backgroundColor: activeApp === 'chatgpt' ? '#10B981' : '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ChatGPT
                </button>
                <button
                  onClick={() => setActiveApp('whatsapp')}
                  style={{
                    backgroundColor: activeApp === 'whatsapp' ? '#22C55E' : '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setActiveApp('notes')}
                  style={{
                    backgroundColor: activeApp === 'notes' ? '#EAB308' : '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Notes
                </button>
              </div>
            </div>

            {/* SCREEN CONTENT */}
            <div style={{
              flex: 1,
              backgroundColor: '#0F172A',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              {/* VIEW 1: THE KEYBOARD SETUP APP (MainActivity) */}
              {activeApp === 'setup' && (
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* App Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      backgroundColor: '#2563EB',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                    }}>
                      <Keyboard size={24} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
                        Prompt Keyboard
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Custom Android IME Setup & Prompts
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Enable Keyboard Card */}
                  <div style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                        Step 1: Enable Keyboard
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: isImeEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isImeEnabled ? '#34D399' : '#FBBF24'
                      }}>
                        {isImeEnabled ? '✓ Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', lineHeight: '1.4' }}>
                      Turn on Prompt Keyboard in Android System Settings.
                    </div>
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      style={{
                        width: '100%',
                        backgroundColor: isImeEnabled ? '#334155' : '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Settings size={14} />
                      {isImeEnabled ? 'Configure in System Settings' : 'Enable in Settings'}
                    </button>
                  </div>

                  {/* Step 2: Select Keyboard Card */}
                  <div style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                        Step 2: Select Keyboard
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: isImeActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isImeActive ? '#34D399' : '#FBBF24'
                      }}>
                        {isImeActive ? '✓ Active' : 'Not active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', lineHeight: '1.4' }}>
                      Switch your active system input method to Prompt Keyboard.
                    </div>
                    <button
                      onClick={() => setShowImePickerModal(true)}
                      style={{
                        width: '100%',
                        backgroundColor: isImeActive ? '#10B981' : '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle size={14} />
                      {isImeActive ? 'Prompt Keyboard Selected' : 'Switch Input Method'}
                    </button>
                  </div>

                  {/* Prompt Management Card */}
                  <div style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                        Loaded Prompts ({prompts.length})
                      </div>
                      {prompts.length > 0 && (
                        <button
                          onClick={() => {
                            setPrompts([]);
                            showToast('Cleared all loaded prompts');
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px' }}>
                      Upload any JSON file to populate prompt parts into the keyboard.
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileUp size={14} />
                      {prompts.length === 0 ? 'Upload JSON File' : 'Upload New JSON (Replace)'}
                    </button>
                  </div>

                  {/* Test Area Card */}
                  <div style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid #3B82F6'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>
                        Test Keyboard Field
                      </span>
                      {inputText.length > 0 && (
                        <button
                          onClick={() => setInputText('')}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={() => setShowKeyboardInSetup(true)}
                      placeholder="Tap here to test typing, shift, and 'Use Part' prompt insertion…"
                      style={{
                        width: '100%',
                        height: '64px',
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontFamily: inputText.includes('{') ? "'JetBrains Mono', monospace" : 'inherit',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* VIEW 2: EXTERNAL TARGET APPS (ChatGPT, WhatsApp, Notes) */}
              {activeApp !== 'setup' && (
                <div style={{
                  flex: 1,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{
                    backgroundColor: '#1E293B',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#CBD5E1',
                    alignSelf: 'flex-start',
                    maxWidth: '88%'
                  }}>
                    {activeApp === 'chatgpt' && (
                      <>
                        🤖 <strong>ChatGPT 4o:</strong> Send your next prompt part below. Open the <strong>PROMPT tab</strong> on the keyboard and tap <strong>[Use Part X]</strong>!
                      </>
                    )}
                    {activeApp === 'whatsapp' && (
                      <>
                        💬 <strong>WhatsApp Chat:</strong> Tap the input box and use the keyboard to send your JSON prompt payload or type regular messages!
                      </>
                    )}
                    {activeApp === 'notes' && (
                      <>
                        📝 <strong>Quick Notes:</strong> Keep your video script and generative scene prompts organized here.
                      </>
                    )}
                  </div>

                  {/* Active Input Field in Target App */}
                  <div style={{
                    marginTop: 'auto',
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    padding: '10px',
                    border: '1px solid #3B82F6'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600 }}>
                        Message Field (Active InputConnection)
                      </span>
                      {inputText.length > 0 && (
                        <button
                          onClick={() => setInputText('')}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Tap to type with Prompt Keyboard…"
                      style={{
                        width: '100%',
                        height: '65px',
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontFamily: inputText.includes('{') ? "'JetBrains Mono', monospace" : 'inherit',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SIMULATED ANDROID SETTINGS MODAL */}
              {showSettingsModal && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#0F172A',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    borderBottom: '1px solid #334155',
                    paddingBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={18} color="#38BDF8" />
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>
                        Manage On-Screen Keyboards
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSettingsModal(false)}
                      style={{
                        backgroundColor: '#334155',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '14px' }}>
                    Android System Settings &gt; Languages &amp; Input &gt; On-screen keyboard
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Gboard Toggle */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1E293B',
                      padding: '12px',
                      borderRadius: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Gboard</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Multilingual typing</div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>ON</span>
                    </div>

                    {/* Prompt Keyboard Toggle */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1E293B',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #3B82F6'
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                          Prompt Keyboard
                        </div>
                        <div style={{ fontSize: '11px', color: '#38BDF8' }}>
                          Custom IME with JSON Prompts
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newState = !isImeEnabled;
                          setIsImeEnabled(newState);
                          if (!newState) setIsImeActive(false);
                          showToast(newState ? '✓ Prompt Keyboard Enabled in Settings' : 'Prompt Keyboard Disabled');
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {isImeEnabled ? (
                          <ToggleRight size={36} color="#10B981" />
                        ) : (
                          <ToggleLeft size={36} color="#64748B" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 'auto',
                    backgroundColor: '#1E293B',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#CBD5E1',
                    lineHeight: '1.4'
                  }}>
                    💡 Toggle <strong>Prompt Keyboard</strong> ON to allow it to be selected as your active input method.
                  </div>
                </div>
              )}

              {/* SIMULATED ANDROID CHOOSE INPUT METHOD DIALOG */}
              {showImePickerModal && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  zIndex: 25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    width: '100%',
                    backgroundColor: '#1E293B',
                    borderRadius: '16px',
                    padding: '18px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                      Change keyboard
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Gboard option */}
                      <div
                        onClick={() => {
                          setIsImeActive(false);
                          setShowImePickerModal(false);
                          showToast('Switched to Gboard');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: !isImeActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input type="radio" checked={!isImeActive} readOnly />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>Gboard</div>
                          <div style={{ fontSize: '10px', color: '#94A3B8' }}>English (US)</div>
                        </div>
                      </div>

                      {/* Prompt Keyboard option */}
                      <div
                        onClick={() => {
                          setIsImeActive(true);
                          setShowImePickerModal(false);
                          showToast('✓ Switched to Prompt Keyboard');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isImeActive ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                          border: isImeActive ? '1px solid #3B82F6' : '1px solid transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input type="radio" checked={isImeActive} readOnly />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8' }}>
                            Prompt Keyboard
                          </div>
                          <div style={{ fontSize: '10px', color: '#CBD5E1' }}>
                            Translucent IME with JSON Prompts
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                      <button
                        onClick={() => setShowImePickerModal(false)}
                        style={{
                          backgroundColor: '#334155',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* REALISTIC TRANSLUCENT CUSTOM ANDROID KEYBOARD (IME) */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(9, 13, 22, 0.96) 0%, rgba(19, 24, 40, 0.94) 50%, rgba(15, 23, 42, 0.97) 100%)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 4px 14px 4px',
              position: 'relative',
              userSelect: 'none'
            }}>
              {/* Keyboard Top Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                height: '36px',
                padding: '0 4px',
                marginBottom: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '8px',
                gap: '6px'
              }}>
                {/* Keyboard Tab */}
                <button
                  onClick={() => setActiveTab('keyboard')}
                  title="Normal Keyboard"
                  style={{
                    backgroundColor: activeTab === 'keyboard' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'keyboard' ? '#38BDF8' : '#FFFFFF',
                    width: '32px',
                    height: '28px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Keyboard size={16} />
                </button>

                {/* Quick Emoji Strip */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '4px',
                  scrollbarWidth: 'none'
                }}>
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertText(emoji)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '15px',
                        cursor: 'pointer',
                        padding: '2px 4px'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Clipboard Tab */}
                <button
                  onClick={() => setActiveTab('clipboard')}
                  title="Clipboard"
                  style={{
                    backgroundColor: activeTab === 'clipboard' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'clipboard' ? '#38BDF8' : '#FFFFFF',
                    width: '32px',
                    height: '28px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Copy size={15} />
                </button>

                {/* Prompts Tab with Badge */}
                <button
                  onClick={() => setActiveTab('prompts')}
                  title="Prompts Tab"
                  style={{
                    backgroundColor: activeTab === 'prompts' ? 'rgba(37, 99, 235, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    padding: '0 8px',
                    height: '28px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  <FileCode2 size={14} color="#38BDF8" />
                  <span>PROMPT</span>
                  <span style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '10px'
                  }}>
                    {prompts.length}
                  </span>
                </button>
              </div>

              {/* Panel 1: NORMAL QWERTY / SYMBOLS KEYBOARD */}
              {activeTab === 'keyboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {/* Row 1 */}
                  <div style={{ display: 'flex', gap: '4px', height: '38px' }}>
                    {(isSymbols ? symbolsRow1 : qwertyRow1).map((key) => {
                      const char = isShifted ? key.toUpperCase() : key;
                      return (
                        <button
                          key={key}
                          onClick={() => insertText(char)}
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.14)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '7px',
                            color: '#FFFFFF',
                            fontSize: '16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row 2 */}
                  <div style={{ display: 'flex', gap: '4px', height: '38px', padding: '0 10px' }}>
                    {(isSymbols ? symbolsRow2 : qwertyRow2).map((key) => {
                      const char = isShifted ? key.toUpperCase() : key;
                      return (
                        <button
                          key={key}
                          onClick={() => insertText(char)}
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.14)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '7px',
                            color: '#FFFFFF',
                            fontSize: '16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row 3 */}
                  <div style={{ display: 'flex', gap: '4px', height: '38px' }}>
                    <button
                      onClick={() => setIsShifted(!isShifted)}
                      style={{
                        flex: 1.4,
                        backgroundColor: isShifted ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.22)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        color: isShifted ? '#38BDF8' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ArrowUp size={16} />
                    </button>

                    {(isSymbols ? symbolsRow3 : qwertyRow3).map((key) => {
                      const char = isShifted ? key.toUpperCase() : key;
                      return (
                        <button
                          key={key}
                          onClick={() => insertText(char)}
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.14)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '7px',
                            color: '#FFFFFF',
                            fontSize: '16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {char}
                        </button>
                      );
                    })}

                    <button
                      onClick={handleBackspace}
                      style={{
                        flex: 1.4,
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Delete size={16} />
                    </button>
                  </div>

                  {/* Row 4 */}
                  <div style={{ display: 'flex', gap: '4px', height: '38px' }}>
                    <button
                      onClick={() => setIsSymbols(!isSymbols)}
                      style={{
                        flex: 1.3,
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isSymbols ? 'ABC' : '?123'}
                    </button>

                    <button
                      onClick={() => insertText(',')}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.14)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '7px',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      ,
                    </button>

                    <button
                      onClick={() => insertText(' ')}
                      style={{
                        flex: 4.2,
                        backgroundColor: 'rgba(255, 255, 255, 0.18)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        color: '#94A3B8',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      space
                    </button>

                    <button
                      onClick={() => insertText('.')}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.14)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '7px',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      .
                    </button>

                    <button
                      onClick={handleEnter}
                      style={{
                        flex: 1.5,
                        backgroundColor: '#2563EB',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        borderRadius: '7px',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CornerDownLeft size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Panel 2: PROMPTS TAB */}
              {activeTab === 'prompts' && (
                <div style={{
                  height: '170px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '6px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                      PROMPTS ({prompts.length})
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.2)',
                          color: '#38BDF8',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + Upload JSON
                      </button>
                      <button
                        onClick={() => setActiveTab('keyboard')}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#94A3B8',
                          border: 'none',
                          borderRadius: '6px',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Prompts list */}
                  {prompts.length === 0 ? (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                        No prompts loaded
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Upload JSON File
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      paddingRight: '4px'
                    }}>
                      {prompts.map((part) => (
                        <div
                          key={part.partNumber}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                              Part {part.partNumber}
                            </div>
                            {part.title && (
                              <div style={{
                                fontSize: '10px',
                                color: '#94A3B8',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {part.title}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedPartPreview(part)}
                              title="Inspect JSON"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: '#94A3B8',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleUsePart(part)}
                              style={{
                                backgroundColor: '#2563EB',
                                border: '1px solid rgba(96, 165, 250, 0.3)',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Use Part {part.partNumber}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Panel 3: CLIPBOARD TAB */}
              {activeTab === 'clipboard' && (
                <div style={{ height: '170px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '6px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>CLIPBOARD</span>
                    <button
                      onClick={() => setActiveTab('keyboard')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#94A3B8',
                        border: 'none',
                        borderRadius: '6px',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {clipboardItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          insertText(item);
                          showToast('✓ Pasted clipboard item');
                        }}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#CBD5E1'
                        }}
                      >
                        {item}
                        <div style={{ fontSize: '10px', color: '#38BDF8', marginTop: '4px', fontWeight: 600 }}>
                          Tap to insert
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Right Column: Setup Guide in Hindi & English, JSON Upload, and Real Phone Setup Instructions */}
        {(viewMode === 'both' || viewMode === 'guide') && (
        <div style={{
          flex: 1,
          minWidth: '300px',
          maxWidth: '700px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box'
        }}>
          {/* Main Setup Instructions Banner (Hindi + English) */}
          <div style={{
            backgroundColor: '#1E293B',
            border: '2px solid #2563EB',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                backgroundColor: '#2563EB',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex'
              }}>
                <Settings size={22} color="#FFFFFF" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                  Keyboard Setup Guide / कीबोर्ड सेटअप कहाँ से करें
                </h2>
                <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 600 }}>
                  Left Phone Simulator + Real Android Device Instructions
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#0F172A',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #334155',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#34D399', marginBottom: '6px' }}>
                📱 1. इस स्क्रीन पर टेस्ट और सेटअप करने के लिए (In This Preview):
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#CBD5E1', lineHeight: '1.6' }}>
                <li>
                  बायें (Left) तरफ फ़ोन स्क्रीन में <strong>"Setup App"</strong> खुला हुआ है।
                </li>
                <li>
                  <strong>Step 1:</strong> <code>Enable in Settings</code> बटन दबायें (यहाँ से कीबोर्ड चालू होता है)।
                </li>
                <li>
                  <strong>Step 2:</strong> <code>Switch Input Method</code> बटन दबायें और <strong>Prompt Keyboard</strong> चुनें।
                </li>
                <li>
                  नीचे <strong>"Test Keyboard Field"</strong> पर क्लिक करें, कीबोर्ड खुल जाएगा।
                </li>
                <li>
                  कीबोर्ड के ऊपर दिए गए <strong>PROMPT</strong> बटन पर टैप करें और किसी भी <strong>[Use Part]</strong> बटन से पूरा JSON एक क्लिक में इन्सर्ट करें!
                </li>
              </ul>
            </div>

            <div style={{
              backgroundColor: '#0F172A',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #334155',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#60A5FA', marginBottom: '6px' }}>
                📲 2. असली Android फ़ोन में कैसे सेटअप करें (On Real Android Phone):
              </div>
              <div style={{ fontSize: '12.5px', color: '#CBD5E1', lineHeight: '1.6' }}>
                जब आप इस ऐप का APK अपने फ़ोन में इनस्टॉल करते हैं:
                <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                  <li>
                    फ़ोन की <strong>Settings (सेटिंग्स)</strong> खोलें।
                  </li>
                  <li>
                    <strong>System</strong> (या <strong>Additional Settings</strong>) &gt; <strong>Languages &amp; Input (भाषा और इनपुट)</strong> &gt; <strong>Manage Keyboards (ऑन-स्क्रीन कीबोर्ड)</strong> में जाएं।
                  </li>
                  <li>
                    वहाँ <strong>"Prompt Keyboard"</strong> को <strong>चालू (Toggle ON)</strong> करें।
                  </li>
                  <li>
                    अब WhatsApp, Chrome या ChatGPT खोलें, टाइपिंग बॉक्स पर क्लिक करें, नीचे छोटे कीबोर्ड आइकॉन को दबाकर <strong>Prompt Keyboard</strong> चुन लें!
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* JSON File Upload & Management Card */}
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileUp size={18} color="#38BDF8" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Upload &amp; Manage JSON Prompts</span>
              </div>
              <span style={{
                backgroundColor: '#1E293B',
                color: '#38BDF8',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {prompts.length} Loaded
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 14px 0' }}>
              Upload any JSON prompt document. It preserves the complete, unsummarized JSON object with all nested fields for direct injection.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json,text/plain"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileUp size={16} />
                Upload JSON File
              </button>

              <button
                onClick={() => {
                  setPrompts(SAMPLE_18_PROMPTS);
                  showToast('✓ Loaded 18 Sample Video Prompts');
                }}
                style={{
                  backgroundColor: '#1E293B',
                  color: '#CBD5E1',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={16} color="#EAB308" />
                Reset to 18 Sample Prompts
              </button>

              {prompts.length > 0 && (
                <button
                  onClick={() => {
                    setPrompts([]);
                    showToast('Cleared all prompts');
                  }}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* JSON Inspector Card */}
          {selectedPartPreview && (
            <div style={{
              backgroundColor: '#0F172A',
              border: '1px solid #38BDF8',
              borderRadius: '16px',
              padding: '18px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#38BDF8' }}>
                  Part {selectedPartPreview.partNumber} Complete JSON Payload
                </span>
                <button
                  onClick={() => setSelectedPartPreview(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>
              <pre style={{
                backgroundColor: '#05070D',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#A5F3FC',
                maxHeight: '220px',
                overflowY: 'auto',
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {selectedPartPreview.fullJson}
              </pre>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
