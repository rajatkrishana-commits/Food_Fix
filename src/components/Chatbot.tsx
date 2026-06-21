import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ChefHat, Sparkles, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  text: string;
  isBot: boolean;
  timestamp: string;
  image?: string; // Holds base64 data to display what the user uploaded
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Hello! How can I help you with your order today?',
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom inside the chat container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !attachedImage) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = message;
    const userImg = attachedImage;

    // 1. Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        text: userMsg || 'Uploaded an image for review.',
        isBot: false,
        timestamp: userTime,
        image: userImg || undefined,
      },
    ]);

    // Reset fields
    setMessage('');
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsTyping(true);

    try {
      // Prepare conversation history (exclude current message)
      const formattedHistory = messages.map((m) => ({
        text: m.text,
        isBot: m.isBot,
      }));

      // 2. Call the server-side API (safe/secure)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMsg || 'Please analyze this food quality issue.',
          image: userImg,
          history: formattedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response error');
      }

      const data = await response.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => [
        ...prev,
        {
          text: data.text,
          isBot: true,
          timestamp: botTime,
        },
      ]);
    } catch (err) {
      console.error('Chat endpoint error:', err);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          text: 'I am routing your request to a human support agent.',
          isBot: true,
          timestamp: botTime,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        id="chatbot-trigger-bubble"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 p-4 md:p-5 bg-orange-600 text-white rounded-full shadow-xl shadow-orange-600/20 z-50 hover:scale-105 active:scale-95 transition-all duration-200 group flex items-center justify-center cursor-pointer"
        aria-label="Toggle support assistant"
      >
        <div className="relative">
          {isOpen ? (
            <X size={26} className="transition-transform duration-200 rotate-0 group-hover:rotate-90" />
          ) : (
            <>
              <MessageCircle size={26} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
            </>
          )}
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-4 sm:inset-auto sm:bottom-28 sm:right-8 sm:w-[380px] sm:h-[520px] bg-white shadow-2xl rounded-3xl border border-zinc-100 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-50 flex justify-between items-center bg-zinc-950 text-white relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
                  <ChefHat size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm tracking-tight">Food Fix Concierge</h3>
                    <Sparkles size={12} className="text-amber-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online • Ready to assist
                  </span>
                </div>
              </div>
              <button
                id="chatbot-close-button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-5 overflow-y-auto bg-zinc-50/50 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${msg.isBot ? 'self-start' : 'self-end ml-auto'}`}
                >
                  <div
                    className={`p-4 rounded-2xl text-[13px] leading-relaxed relative ${
                      msg.isBot
                        ? 'bg-white text-zinc-800 shadow-sm border border-zinc-100 rounded-tl-none'
                        : 'bg-orange-600 text-white shadow-md shadow-orange-600/10 rounded-tr-none'
                    }`}
                  >
                    {/* Render Chat Text */}
                    {msg.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={lIdx > 0 ? "mt-1.5" : ""}>{line}</p>
                    ))}

                    {/* Render Attached Image, if any */}
                    {msg.image && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-white/20">
                        <img
                          src={msg.image}
                          alt="Uploaded attachment"
                          className="w-full max-h-48 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] mt-1 text-zinc-400 px-1 ${!msg.isBot && 'text-right'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex flex-col max-w-[40%] self-start">
                  <div className="bg-white text-zinc-800 shadow-sm border border-zinc-100 rounded-2xl p-4 rounded-tl-none flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-orange-600 rounded-full animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 bg-orange-600 rounded-full animate-bounce delay-200" />
                    <span className="h-1.5 w-1.5 bg-orange-600 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Thumbnail preview of the attachment (stays persistent until sent or cleared) */}
            {attachedImage && (
              <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center gap-3">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-zinc-200">
                  <img src={attachedImage} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    onClick={removeAttachment}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="text-xs text-zinc-500">
                  Image attached. Say what's wrong!
                </div>
              </div>
            )}

            {/* Input Action Panel */}
            <div className="p-4 bg-white border-t border-zinc-100 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={triggerFileInput}
                className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Attach photo of your order"
              >
                <Paperclip size={18} />
              </button>

              <input
                id="chatbot-input-field"
                type="text"
                placeholder="Ask support or report an issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-2xl px-4 py-3 text-xs outline-none transition-all placeholder:text-zinc-400 text-zinc-800"
              />
              <button
                id="chatbot-submit-button"
                onClick={handleSend}
                disabled={!message.trim() && !attachedImage}
                className={`p-3 rounded-2xl text-white transition-all transform cursor-pointer flex items-center justify-center ${
                  message.trim() || attachedImage
                    ? 'bg-orange-600 hover:bg-orange-500 shadow-md shadow-orange-600/15 scale-100'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed scale-95'
                }`}
                aria-label="Send Message"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
