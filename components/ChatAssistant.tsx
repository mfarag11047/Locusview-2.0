import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { SubmittedJobData } from '../types';
import { SendIcon, SparklesIcon } from './icons';

interface ChatAssistantProps {
  data: SubmittedJobData[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ data }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [conversation]);

  useEffect(() => {
    const initializeChat = async () => {
       if (data.length === 0) {
        setConversation([]);
        setChat(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        if (!process.env.API_KEY) {
          setError("API key not found. Chat assistant is disabled.");
          setIsLoading(false);
          return;
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `You are an expert AI assistant for a GIS Manager at a utility construction company. Your role is to analyze and answer questions about completed field jobs. You have been provided with the latest job data in JSON format. Be concise, accurate, and professional.`,
          },
        });
        setChat(newChat);
        
        const dataContext = `Here is the current job data for your context: ${JSON.stringify(data, null, 2)}. Now, please greet the user and offer to help with analyzing this data.`;
        const result = await newChat.sendMessageStream({ message: dataContext });

        let welcomeMessage = '';
        for await (const chunk of result) {
            welcomeMessage += chunk.text;
        }

        setConversation([{ role: 'model', text: welcomeMessage }]);
        setIsLoading(false);

      } catch (e) {
        console.error("Failed to initialize chat:", e);
        setError("Could not start the AI assistant.");
        setIsLoading(false);
      }
    };

    initializeChat();

  }, [data]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chat || isLoading) return;

    const userMessage: Message = { role: 'user', text: userInput };
    setConversation(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
        const result = await chat.sendMessageStream({ message: userInput });
        
        let fullResponse = '';
        setConversation(prev => [...prev, { role: 'model', text: '' }]);
        
        for await (const chunk of result) {
          fullResponse += chunk.text;
          setConversation(prev => {
            const newConversation = [...prev];
            newConversation[newConversation.length - 1].text = fullResponse;
            return newConversation;
          });
        }

    } catch (err) {
      console.error("Error sending message:", err);
      setError("Sorry, something went wrong. Please try again.");
      // Rollback optimistic update
       setConversation(prev => prev.filter(msg => msg !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white border border-gray-200/80 rounded-lg p-4 shadow-sm flex flex-col h-96">
      <h3 className="font-bold text-locus-blue flex items-center gap-2 text-lg mb-2 border-b border-gray-200 pb-2">
        <SparklesIcon className="w-6 h-6" />
        AI Job Assistant
      </h3>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 text-sm">
        {conversation.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-xl max-w-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-locus-blue text-white' : 'bg-gray-100 text-locus-text'}`}>
              {msg.text}
            </div>
          </div>
        ))}
         {isLoading && conversation[conversation.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="p-3 rounded-xl bg-gray-100 text-locus-text">
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && <p className="text-red-500 text-xs text-center py-2">{error}</p>}
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 border-t border-gray-200 pt-3">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about job status, materials..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-locus-orange focus:border-transparent transition"
          disabled={isLoading || !chat || !!error}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim() || !chat || !!error}
          className="bg-locus-orange text-white p-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center w-12"
          aria-label="Send message"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatAssistant;
