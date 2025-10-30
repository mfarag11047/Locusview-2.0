import React, { useState, useEffect } from 'react';
import type { ChecklistItem } from '../types';
import { ShieldCheckIcon } from './icons';

interface SafetyChecklistModalProps {
  checklist: ChecklistItem[];
  onComplete: (completedItems: ChecklistItem[]) => void;
  onClose: () => void;
}

const SafetyChecklistModal: React.FC<SafetyChecklistModalProps> = ({ checklist, onComplete, onClose }) => {
  const [checklistState, setChecklistState] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    // Initialize internal state from props
    setChecklistState(checklist.map(item => ({ ...item, completed: false })));
  }, [checklist]);

  const handleCheckboxChange = (id: string) => {
    setChecklistState(prevState =>
      prevState.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const isAllComplete = checklistState.every(item => item.completed);

  const handleSubmit = () => {
    if (isAllComplete) {
      onComplete(checklistState);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-4">
          <ShieldCheckIcon className="w-8 h-8 text-locus-orange" />
          <h2 className="text-xl font-bold text-locus-text">Pre-Job Safety Checklist</h2>
        </div>
        
        <p className="text-gray-600 text-sm mb-6">
            All items must be completed and confirmed before proceeding with the job.
        </p>

        <div className="space-y-4 flex-grow mb-6">
          {checklistState.map(item => (
            <label key={item.id} htmlFor={item.id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                id={item.id}
                type="checkbox"
                checked={item.completed}
                onChange={() => handleCheckboxChange(item.id)}
                className="h-6 w-6 rounded border-gray-300 text-locus-blue focus:ring-locus-blue"
              />
              <span className="ml-4 font-medium text-locus-text">{item.prompt}</span>
            </label>
          ))}
        </div>
        
        <div className="flex justify-end gap-3">
            <button
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-all"
            >
                Cancel
            </button>
            <button
                onClick={handleSubmit}
                disabled={!isAllComplete}
                className={`font-bold py-2 px-6 rounded-lg transition-all ${
                    !isAllComplete
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-locus-orange hover:opacity-90 text-white shadow-lg'
                }`}
            >
                Confirm & Continue
            </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyChecklistModal;