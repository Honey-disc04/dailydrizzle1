import { Article } from '../types';

export const mockArticles: Article[] = [
  {
    id: '1',
    title: 'AI Revolution: Machine Learning Transforms Healthcare Diagnostics',
    description: 'New AI systems are achieving unprecedented accuracy in medical imaging, revolutionizing how doctors diagnose diseases.',
    content: 'Artificial intelligence is revolutionizing healthcare diagnostics with new machine learning systems achieving 95% accuracy in medical imaging...',
    url: 'https://example.com/ai-healthcare',
    urlToImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    publishedAt: new Date().toISOString(),
    source: 'Tech News Daily',
    author: 'Dr. Sarah Johnson',
    category: 'technology',
    language: 'en',
    tags: ['AI', 'Healthcare', 'Technology', 'Machine Learning'],
    summary: 'AI systems are achieving 95% accuracy in medical imaging diagnostics, helping doctors identify diseases earlier and more accurately.'
  },
  {
    id: '2',
    title: 'Climate Change: Renewable Energy Reaches Historic Milestone',
    description: 'Global renewable energy capacity surpasses fossil fuels for the first time in history.',
    content: 'In a historic moment for environmental progress, renewable energy capacity worldwide has exceeded fossil fuel capacity...',
    url: 'https://example.com/renewable-energy',
    urlToImage: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Environment Today',
    author: 'Mike Chen',
    category: 'science',
    language: 'en',
    tags: ['Climate', 'Energy', 'Environment', 'Sustainability'],
    summary: 'Renewable energy capacity has surpassed fossil fuels globally, marking a turning point in the fight against climate change.'
  },
  {
    id: '3',
    title: 'Space Exploration: Mars Mission Discovers Ancient Water Reservoirs',
    description: 'NASA rover finds evidence of massive underground water deposits on Mars.',
    content: 'The latest Mars rover mission has made a groundbreaking discovery of ancient underground water reservoirs...',
    url: 'https://example.com/mars-water',
    urlToImage: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800',
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    source: 'Space News',
    author: 'Dr. Emily Rodriguez',
    category: 'science',
    language: 'en',
    tags: ['Space', 'Mars', 'NASA', 'Exploration'],
    summary: 'Ancient underground water reservoirs discovered on Mars could support future human missions and potential colonization.'
  }
];