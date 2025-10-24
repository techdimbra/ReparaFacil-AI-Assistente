
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { SparklesIcon, UserIcon } from './icons';
import { BusinessCard } from './BusinessCard';

interface ChatMessageProps {
  message: ChatMessageType;
}

const LoadingIndicator = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
    </div>
);

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {isModel && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl max-w-md md:max-w-xl lg:max-w-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-700 text-gray-200 rounded-bl-none'
          }`}
        >
          {message.imagePreview && (
            <img src={message.imagePreview} alt="Upload preview" className="rounded-lg mb-2 max-h-48" />
          )}

          {message.isWaiting ? <LoadingIndicator /> : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}

          {message.businesses && message.businesses.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Encontrei estes profissionais:</h3>
              <div className="flex flex-col items-start">
                {message.businesses.map((business, index) => (
                  <BusinessCard key={index} business={business} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isUser && (
         <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};
