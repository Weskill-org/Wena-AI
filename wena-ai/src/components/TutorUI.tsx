
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, StopCircle, 
  MessageSquare, Settings, X, ChevronLeft, Play, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGeminiLive } from '@/lib/use-gemini-live';
import { USE_CASES } from '@/lib/constants';
import { Avatar } from './Avatar';

export const TutorUI = () => {
  const [selectedUseCase, setSelectedUseCase] = useState<typeof USE_CASES[0] | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { 
    isConnected, 
    messages, 
    isModelSpeaking, 
    volume, 
    connect, 
    disconnect, 
    sendVideoFrame 
  } = useGeminiLive();

  // Handle camera/screen stream
  useEffect(() => {
    const startStream = async () => {
      try {
        if (isScreenSharing) {
          streamRef.current = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } else if (isCameraOn) {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      } catch (err) {
        console.error("Media Error:", err);
        setIsCameraOn(false);
        setIsScreenSharing(false);
      }
    };

    startStream();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [isCameraOn, isScreenSharing]);

  // Frame capture loop
  useEffect(() => {
    let intervalId: any;
    if (isConnected && (isCameraOn || isScreenSharing)) {
      intervalId = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            sendVideoFrame(base64Data);
          }
        }
      }, 1000); // Send frame every second
    }
    return () => clearInterval(intervalId);
  }, [isConnected, isCameraOn, isScreenSharing, sendVideoFrame]);

  const handleStart = async () => {
    if (selectedUseCase) {
      await connect(selectedUseCase.instruction);
    }
  };

  const handleStop = () => {
    disconnect();
    setIsCameraOn(false);
    setIsScreenSharing(false);
  };

  if (!selectedUseCase) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full"
        >
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Wena AI
            </h1>
            <p className="text-slate-400 text-xl">Your personal AI Tutor for real-time learning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <motion.div
                key={uc.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedUseCase(uc)}
                className="cursor-pointer"
              >
                <Card className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-colors h-full overflow-hidden group">
                  <div className={`h-2 bg-gradient-to-r ${uc.color}`} />
                  <CardContent className="p-6">
                    <div className="mb-4 p-3 rounded-xl bg-slate-800 w-fit group-hover:bg-blue-500/20 transition-colors">
                      <uc.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{uc.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{uc.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 border-bottom border-slate-800 flex items-center justify-between bg-slate-900/30 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (isConnected) handleStop();
              setSelectedUseCase(null);
            }}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="font-bold text-lg leading-none">{selectedUseCase.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                {isConnected ? 'Live Session' : 'Ready to Start'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`rounded-full ${isCameraOn ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700'}`}
                  onClick={() => {
                    setIsCameraOn(!isCameraOn);
                    setIsScreenSharing(false);
                  }}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Camera</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`rounded-full ${isScreenSharing ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700'}`}
                  onClick={() => {
                    setIsScreenSharing(!isScreenSharing);
                    setIsCameraOn(false);
                  }}
                >
                  <Monitor className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Screen Share</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`rounded-full ${showChat ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700'}`}
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Transcript</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-8 bg-slate-800 mx-2" />

          {isConnected ? (
            <Button 
              variant="destructive" 
              onClick={handleStop}
              className="rounded-full px-6 font-bold"
            >
              <StopCircle className="w-4 h-4 mr-2" /> End Session
            </Button>
          ) : (
            <Button 
              onClick={handleStart}
              className="rounded-full px-8 font-bold bg-blue-600 hover:bg-blue-500"
            >
              <Play className="w-4 h-4 mr-2 fill-current" /> Start
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center p-8">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
        </div>

        {/* Avatar Display */}
        <div className="z-10 flex flex-col items-center gap-8">
          <Avatar volume={volume} isSpeaking={isModelSpeaking} />
          
          <AnimatePresence>
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center max-w-md"
              >
                <h3 className="text-2xl font-bold mb-2">Ready to learn?</h3>
                <p className="text-slate-400">Click start to begin your real-time session with Wena AI. You can enable your camera or share your screen for a more interactive experience.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Preview */}
        <AnimatePresence>
          {(isCameraOn || isScreenSharing) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="absolute bottom-8 right-8 w-64 aspect-video bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden z-20"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-black/50 backdrop-blur-md border-none text-[10px] uppercase tracking-tighter">
                  {isScreenSharing ? 'Screen' : 'Camera'}
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat / Transcript Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute top-0 right-0 bottom-0 w-96 bg-slate-900/80 backdrop-blur-2xl border-l border-slate-800 z-40 flex flex-col"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Live Transcript
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-12">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm italic">Transcript will appear here as you speak...</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                        {msg.role === 'user' ? 'You' : 'Wena AI'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} width={320} height={240} className="hidden" />
      
      {/* Footer Status */}
      <footer className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-500' : 'bg-slate-700'}`} />
            Gemini 3.1 Flash Live
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isCameraOn || isScreenSharing ? 'bg-purple-500' : 'bg-slate-700'}`} />
            Visual Input: {isCameraOn ? 'Camera' : isScreenSharing ? 'Screen' : 'None'}
          </div>
        </div>
        <div>
          &copy; 2026 Wena AI Education
        </div>
      </footer>
    </div>
  );
};
