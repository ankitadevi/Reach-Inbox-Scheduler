import React from 'react';
import { Search, SlidersHorizontal, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalResults: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onRefresh,
  isRefreshing,
  totalResults,
}) => {
  return (
    <header className="h-16 border-b border-gray-100 bg-white px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input Container matching Figma */}
      <div className="relative w-96 max-w-full">
        <div className="flex items-center gap-2.5 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white border border-transparent focus-within:border-emerald-500 transition-all">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emails via Elasticsearch..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 text-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium px-1"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium">
          {totalResults} {totalResults === 1 ? 'email' : 'emails'}
        </span>

        {/* Filter Button */}
        <button
          title="Filter results"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh emails"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
