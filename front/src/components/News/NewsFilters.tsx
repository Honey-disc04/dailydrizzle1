import { NewsFilter } from '../../types';

interface NewsFiltersProps {
  filters: NewsFilter;
  onFiltersChange: (filters: NewsFilter) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function NewsFilters({ filters, onFiltersChange, isOpen, onToggle }: NewsFiltersProps) {
  const categories = ['general', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
  
  return (
    <div>
      <button 
        onClick={onToggle}
        className="px-4 py-2 bg-gray-200 rounded-lg mb-4"
      >
        {isOpen ? 'Hide Filters' : 'Show Filters'}
      </button>
      
      {isOpen && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onFiltersChange({ ...filters, category: cat })}
              className={`px-4 py-2 rounded-lg ${
                filters.category === cat ? 'bg-gray-700 text-white' : 'bg-blue-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}