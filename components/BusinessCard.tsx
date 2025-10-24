
import React from 'react';
import { Business } from '../types';
import { MapPinIcon, StarIcon } from './icons';

interface BusinessCardProps {
  business: Business;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 my-2 border border-gray-600 w-full max-w-sm">
      <h4 className="font-bold text-blue-300">{business.title || business.name}</h4>
      <div className="flex items-center space-x-2 text-sm text-gray-300">
        {business.rating > 0 && (
          <div className="flex items-center">
            <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
            <span>{business.rating.toFixed(1)}</span>
          </div>
        )}
        {business.uri && (
          <a
            href={business.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-blue-400 transition-colors"
          >
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>Ver no mapa</span>
          </a>
        )}
      </div>
    </div>
  );
};
