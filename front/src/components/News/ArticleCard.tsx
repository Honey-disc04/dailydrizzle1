import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Heart, Sparkles, ExternalLink, Clock, User, X } from 'lucide-react';
import { Article } from '../../types';
import { format } from 'date-fns';

interface ArticleCardProps {
  article: Article;
  isBookmarked?: boolean;
  isLiked?: boolean;
  onBookmark?: (id: string) => void;
  onLike?: (id: string) => void;
  onSummarize?: (id: string) => void;
  showSummary?: boolean;
  summary?: string;
  isSummarizing?: boolean;
}

export function ArticleCard({ 
  article, 
  isBookmarked = false,
  isLiked = false,
  onBookmark,
  onLike,
  onSummarize,
  showSummary = false,
  summary,
  isSummarizing = false
}: ArticleCardProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        className="bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl"
      >
        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 bg-blue-900 text-white text-xs font-semibold rounded-full capitalize">
            {article.category}
          </span>
        </div>

        {/* Image */}
        {article.urlToImage ? (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={article.urlToImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-gray-800 to-sky-800 flex items-center justify-center">
            <span className="text-white text-4xl">📰</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Source and Date */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3" />
              <span className="font-medium">{article.source}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-red-800 transition-colors">
            {article.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {article.description ?? article.content ?? "No description available"}
          </p>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Loading state for summarization */}
          {isSummarizing && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-800 border-t-transparent rounded-full" />
                <span className="text-sm text-blue-800 font-medium">Generating AI summary...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Summarize Button */}
            {onSummarize && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSummarize(article.id);
                }}
                disabled={isSummarizing}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showSummary
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gradient-to-r from-slate-700 to-sky-800 text-white hover:from-red-800 hover:to-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">
                  {isSummarizing ? 'Summarizing...' : showSummary ? 'View Summary' : 'Summarize'}
                </span>
              </motion.button>
            )}

            {/* Like Button */}
            {onLike && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(article.id);
                }}
                className={`p-3 rounded-lg transition-colors ${
                  isLiked
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>
            )}

            {/* Bookmark Button */}
            {onBookmark && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark(article.id);
                }}
                className={`p-3 rounded-lg transition-colors ${
                  isBookmarked
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>
            )}

            {/* External Link Button */}
            <motion.a
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-5 w-5" />
            </motion.a>
          </div>
        </div>
      </motion.div>

      {/* ✨ FLOATING SUMMARY MODAL */}
      <AnimatePresence>
        {showSummary && summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => onSummarize?.(article.id)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[70vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-800 to-gray-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">AI Summary</h3>
                      <p className="text-sm text-white/80">
                        {summary.split(' ').length} words • Powered by BART AI
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSummarize?.(article.id)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                {/* Article Info */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {article.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{article.source}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Text */}
                <div className="prose prose-blue max-w-none">
                  <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike?.(article.id);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isLiked
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">Like</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookmark?.(article.id);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">Save</span>
                  </motion.button>
                </div>

                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-slate-800 to-sky-900 text-white rounded-lg hover:from-yellow-900 hover:to-green-00 transition-colors font-medium"
                >
                  <span>Read Full Article</span>
                  <ExternalLink className="h-4 w-4" />
                </motion.a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}