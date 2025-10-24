import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from './types';
import { getReparaFacilResponse } from './services/geminiService';
import { useLocation } from './hooks/useLocation';
import { ChatMessage } from './components/ChatMessage';
import { 
    PaperclipIcon, 
    SendIcon, 
    SparklesIcon, 
    XCircleIcon,
    ChatBubbleLeftRightIcon,
    CameraIcon,
    WrenchScrewdriverIcon
} from './components/icons';

const App: React.FC = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'initial',
      role: 'system',
      text: 'Olá! Eu sou o ReparaFácil. Descreva o problema ou envie uma foto do item que precisa de reparo.',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { location, error: locationError } = useLocation();

  useEffect(() => {
    if(chatStarted) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatStarted]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() && !imageFile) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      text: userInput,
      imagePreview: imagePreview || undefined,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setUserInput('');
    removeImage();

    const waitingMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: waitingMessageId, role: 'model', text: '', isWaiting: true }]);
    
    try {
      let imagePayload;
      if (imageFile) {
        const base64 = await toBase64(imageFile);
        imagePayload = { base64, mimeType: imageFile.type };
      }

      const history = messages.filter(m => m.role !== 'system');
      const response = await getReparaFacilResponse(history, userMessage.text, imagePayload, location);
      
      const modelMessage: ChatMessageType = {
        id: Date.now().toString(),
        role: 'model',
        text: response.text,
        businesses: response.businesses,
      };

      setMessages(prev => prev.filter(m => m.id !== waitingMessageId));
      setMessages(prev => [...prev, modelMessage]);

    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessageType = {
        id: Date.now().toString(),
        role: 'system',
        text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
      };
      setMessages(prev => prev.filter(m => m.id !== waitingMessageId));
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!chatStarted) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 font-sans">
            <div className="text-center max-w-3xl mx-auto">
                <SparklesIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Bem-vindo ao ReparaFácil AI</h1>
                <p className="text-lg md:text-xl text-gray-400 mb-12">Seu assistente especialista para diagnosticar e consertar qualquer coisa. Rápido, seguro e inteligente.</p>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-400 mx-auto mb-3"/>
                        <h2 className="text-xl font-semibold mb-2">1. Descreva</h2>
                        <p className="text-gray-400">Conte-me o problema com suas palavras. Quanto mais detalhes, melhor!</p>
                    </div>
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                        <CameraIcon className="w-10 h-10 text-blue-400 mx-auto mb-3"/>
                        <h2 className="text-xl font-semibold mb-2">2. Fotografe</h2>
                        <p className="text-gray-400">Envie uma foto para um diagnóstico visual e muito mais preciso.</p>
                    </div>
                     <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                        <WrenchScrewdriverIcon className="w-10 h-10 text-blue-400 mx-auto mb-3"/>
                        <h2 className="text-xl font-semibold mb-2">3. Resolva</h2>
                        <p className="text-gray-400">Receba guias DIY ou encontre os melhores profissionais locais.</p>
                    </div>
                </div>

                <button
                    onClick={() => setChatStarted(true)}
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-500 transition-all text-lg shadow-lg shadow-blue-500/20"
                >
                    Começar o Diagnóstico
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex items-center justify-center sticky top-0 z-10">
            <SparklesIcon className="w-7 h-7 text-blue-400 mr-3" />
            <h1 className="text-xl font-bold text-gray-100">ReparaFácil AI Assistant</h1>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg) =>
                    msg.role === 'system' ? (
                        <div key={msg.id} className="text-center my-4 text-sm text-gray-400 bg-gray-800 rounded-full py-2 px-4 max-w-lg mx-auto">
                            {msg.text}
                        </div>
                    ) : (
                        <ChatMessage key={msg.id} message={msg} />
                    )
                )}
                 <div ref={chatEndRef} />
            </div>
        </main>
        
        <footer className="bg-gray-900/80 backdrop-blur-sm p-4 sticky bottom-0">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                {imagePreview && (
                    <div className="relative w-24 h-24 mb-2 p-1 bg-gray-700 rounded-lg">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded"/>
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-gray-800 rounded-full text-white hover:bg-red-500 transition-colors"
                            aria-label="Remove image"
                        >
                            <XCircleIcon className="w-6 h-6"/>
                        </button>
                    </div>
                )}
                <div className="flex items-center bg-gray-800 rounded-xl p-2 border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        aria-label="Attach image"
                    >
                        <PaperclipIcon className="w-6 h-6"/>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                    />
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleSubmit(e);
                           }
                        }}
                        placeholder="Descreva o problema..."
                        className="flex-1 bg-transparent p-2 text-gray-200 placeholder-gray-500 focus:outline-none resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || (!userInput.trim() && !imageFile)}
                        className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-6 h-6"/>
                    </button>
                </div>
                 {locationError && <p className="text-xs text-red-400 mt-2 text-center">{locationError}. A busca por local pode não funcionar.</p>}
            </form>
        </footer>
    </div>
  );
};

export default App;