import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Mic, Send, X } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hey! I'm your AI learning buddy. Ask me anything about your courses, or let's practice with flashcards!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "That's a great question! Let me help you with that...",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="bg-surface/95 backdrop-blur-lg border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isListening ? 360 : 0 }}
              transition={{ duration: 2, repeat: isListening ? Infinity : 0 }}
              className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center"
            >
              <Bot className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="font-semibold">AI Buddy</h1>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <a href="/" className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-primary text-white"
                    : "bg-surface border border-border text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Orb (when listening) */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-lg z-40 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-primary glow-primary mx-auto mb-6"
              />
              <p className="text-lg font-semibold mb-2">Listening...</p>
              <p className="text-sm text-muted-foreground">Speak now</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="bg-surface/95 backdrop-blur-lg border-t border-border px-4 py-3 sticky bottom-16 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleVoiceToggle}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-smooth ${
              isListening
                ? "bg-gradient-accent glow-accent"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Mic className={`w-5 h-5 ${isListening ? "text-white" : "text-foreground"}`} />
          </motion.button>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-input border-border rounded-2xl h-12"
          />
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center disabled:opacity-50 transition-smooth"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
