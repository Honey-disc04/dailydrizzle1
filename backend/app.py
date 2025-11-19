from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from datetime import datetime
from deep_translator import GoogleTranslator
from newspaper import Article as NewsArticle
from bs4 import BeautifulSoup


load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# API Keys
NEWS_API_KEY = os.getenv('NEWS_API_KEY')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')

# News API Configuration
NEWS_API_URL = 'https://newsapi.org/v2/top-headlines'
HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn'

# Language mapping for NewsAPI
LANGUAGE_MAP = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt'
}

# Language names for translation
LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese'
}

def translate_text(text, target_lang='en'):
    """
    Translate text to target language using Google Translator
    """
    if not text or target_lang == 'en':
        return text
    
    try:
        translator = GoogleTranslator(source='auto', target=target_lang)
        # Split long text into chunks (Google Translator has a 5000 char limit)
        max_length = 4500
        
        if len(text) <= max_length:
            return translator.translate(text)
        
        # Split by sentences for long text
        sentences = text.replace('. ', '.|').split('|')
        translated_sentences = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) < max_length:
                current_chunk += sentence + " "
            else:
                if current_chunk:
                    translated_sentences.append(translator.translate(current_chunk.strip()))
                current_chunk = sentence + " "
        
        if current_chunk:
            translated_sentences.append(translator.translate(current_chunk.strip()))
        
        return " ".join(translated_sentences)
    
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return text  # Return original text if translation fails

@app.route('/')
def home():
    return jsonify({
        'message': 'DailyDrizzle API is running!',
        'version': '1.0',
        'endpoints': {
            '/api/news': 'Get news by category',
            '/api/search': 'Search news by keyword',
            '/api/summarize': 'Summarize article text',
            '/api/translate': 'Translate text to different language',
            '/api/categories': 'Get available categories',
            '/api/languages': 'Get supported languages'
        }
    })

@app.route('/api/news', methods=['GET'])
def get_news():
    """
    Fetch news articles by category
    Query params: category, country, page, lang (for translation)
    """
    category = request.args.get('category', 'general')
    country = request.args.get('country', 'us')
    page = request.args.get('page', 1)
    target_lang = request.args.get('lang', 'en')
    
    if not NEWS_API_KEY:
        return jsonify({'error': 'NEWS_API_KEY not configured'}), 500
    
    try:
        params = {
            'apiKey': NEWS_API_KEY,
            'category': category,
            'country': country,
            'page': page,
            'pageSize': 20
        }
        
        response = requests.get(NEWS_API_URL, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Clean and format articles
        articles = []
        for article in data.get('articles', []):
            if article.get('title') != '[Removed]':
                title = article.get('title', '')
                description = article.get('description', '')
                content = article.get('content', description)
                
                # Translate if needed
                if target_lang != 'en':
                    print(f"Translating article to {target_lang}...")
                    title = translate_text(title, target_lang)
                    description = translate_text(description, target_lang)
                    content = translate_text(content, target_lang)
                
                articles.append({
                    'title': title,
                    'description': description,
                    'url': article.get('url'),
                    'urlToImage': article.get('urlToImage'),
                    'publishedAt': article.get('publishedAt'),
                    'source': article.get('source', {}).get('name'),
                    'author': article.get('author'),
                    'content': content
                })
        
        return jsonify({
            'status': 'success',
            'totalResults': data.get('totalResults', 0),
            'articles': articles,
            'language': target_lang
        })
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch news: {str(e)}'}), 500

@app.route("/api/search", methods=["GET"])
def search_news():
    """
    Search news articles by keyword
    Query params: q (query), lang (language), page
    """
    query = request.args.get("q", "")
    lang = request.args.get("lang", "en")
    page = request.args.get("page", 1)
    translate_to = request.args.get("translate", None)  # Optional translation

    if not query:
        return jsonify({"error": "Search query is required"}), 400

    if not NEWS_API_KEY:
        return jsonify({"error": "NEWS_API_KEY not configured"}), 500

    try:
        search_url = "https://newsapi.org/v2/everything"
        
        # Map language code for NewsAPI
        newsapi_lang = LANGUAGE_MAP.get(lang, 'en')
        
        params = {
            "apiKey": NEWS_API_KEY,
            "q": query,
            "language": newsapi_lang,
            "page": page,
            "pageSize": 20,
            "sortBy": "publishedAt"
        }
        
        response = requests.get(search_url, params=params)
        response.raise_for_status()
        data = response.json()

        articles = []
        for article in data.get("articles", []):
            if article.get("title") != "[Removed]":
                title = article.get("title", "")
                description = article.get("description", "")
                content = article.get("content", description)
                
                # Translate if needed
                if translate_to and translate_to != newsapi_lang:
                    print(f"Translating search results to {translate_to}...")
                    title = translate_text(title, translate_to)
                    description = translate_text(description, translate_to)
                    content = translate_text(content, translate_to)
                
                articles.append({
                    "title": title,
                    "description": description,
                    "url": article.get("url"),
                    "urlToImage": article.get("urlToImage"),
                    "publishedAt": article.get("publishedAt"),
                    "source": article.get("source", {}).get("name"),
                    "author": article.get("author"),
                    "content": content,
                })

        return jsonify({
            "status": "success",
            "totalResults": data.get("totalResults", 0),
            "articles": articles,
            "query": query,
            "language": translate_to or newsapi_lang
        })
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to search news: {str(e)}"}), 500


def scrape_article_content(url):
    """
    Scrape full article content from URL
    Returns: Full article text or None if failed
    """
    if not url:
        return None
    
    print(f"🌐 Attempting to scrape: {url[:60]}...")
    
    try:
        # Method 1: newspaper3k (best for news articles)
        article = NewsArticle(url)
        article.download()
        article.parse()
        
        if article.text and len(article.text) > 200:
            print(f"✅ Scraped {len(article.text)} characters with newspaper3k")
            return article.text
    except Exception as e:
        print(f"⚠️ newspaper3k failed: {str(e)[:100]}")
    
    try:
        # Method 2: BeautifulSoup fallback
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
            # Try to find main content
            article_body = None
            
            # Common article content selectors
            selectors = [
                'article',
                '.article-content',
                '.post-content',
                '.entry-content',
                'main',
                '.story-body',
                '[itemprop="articleBody"]'
            ]
            
            for selector in selectors:
                article_body = soup.select_one(selector)
                if article_body:
                    break
            
            if not article_body:
                article_body = soup.find('body')
            
            if article_body:
                text = article_body.get_text(separator=' ', strip=True)
                # Clean up extra whitespace
                text = ' '.join(text.split())
                
                if len(text) > 200:
                    print(f"✅ Scraped {len(text)} characters with BeautifulSoup")
                    return text
    
    except Exception as e:
        print(f"⚠️ BeautifulSoup failed: {str(e)[:100]}")
    print("❌ Scraping failed, returning None")
    return None

@app.route('/api/summarize', methods=['POST'])
def summarize_article():
    """
    Summarize article text using Hugging Face API with intelligent fallback
    Also supports translation of summary
    Body: { 
        "text": "article text to summarize",
        "lang": "target language for summary",
        
    }
    """
    data = request.get_json()
    text = data.get('text', '')
    target_lang = data.get('lang', 'en')
    url= data.get('url', '')  

    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    print(f"\n{'='*60}")
    print(f"📰 SUMMARIZATION REQUEST")
    print(f"Target Language: {target_lang}")
    print(f"{'='*60}")
    
    # Clean the text thoroughly
    text = text.split('[+')[0].strip()  # Remove NewsAPI truncation markers
    text = ' '.join(text.split())  # Remove extra whitespace
    
    print(f"📏 Original text length: {len(text)} characters, {len(text.split())} words")
    
    # If text is too short, just return it cleaned up
    original_word_count = len(text.split())
    print(f"📊 Final input: {len(text)} chars, {original_word_count} words")
    
    # Handle very short text
    if original_word_count < 30:
        print("⚠️ Text too short, returning as-is")
        return jsonify({
            'summary': text,
            'method': 'short_text',
            'word_count': original_word_count
        })
    
    # STRATEGY 1: AI Summarization
    if HUGGINGFACE_API_KEY:
        print("\n🤖 Attempting AI Summarization (Long Mode)...")
        
        try:
            headers = {
                'Authorization': f'Bearer {HUGGINGFACE_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            # Use maximum input (up to 5000 chars for better summaries)
            max_input = 5000
            input_text = text[:max_input]
            
            # Ensure complete sentences
            if not input_text.endswith(('.', '!', '?')):
                for punct in ['.', '!', '?']:
                    last = input_text.rfind(punct)
                    if last > len(input_text) * 0.6:
                        input_text = input_text[:last + 1]
                        break
            
            print(f"📝 AI Input: {len(input_text)} chars ({len(input_text.split())} words)")
            
            payload = {
                'inputs': input_text,
                'parameters': {
                    'max_length': 512,
                    'min_length': 200,
                    'do_sample': False,
                    'num_beams': 6,
                    'length_penalty': 4.5,
                    'early_stopping': False,
                    'no_repeat_ngram_size': 4,
                    'encoder_no_repeat_ngram_size': 4,
                    'repetition_penalty': 1.3
                },
                'options': {
                    'wait_for_model': True,
                    'use_cache': False
                }
            }
            
            response = requests.post(
                HUGGINGFACE_API_URL,
                headers=headers,
                json=payload,
                timeout=120
            )
            
            print(f"📊 Response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                summary = ''
                if isinstance(result, list) and len(result) > 0:
                    summary = result[0].get('summary_text', '')
                elif isinstance(result, dict):
                    summary = result.get('summary_text', '')
                
                if summary:
                    summary = summary.strip()
                    raw_words = len(summary.split())
                    
                    print(f"📄 Raw AI: {raw_words} words")
                    
                    # Ensure complete sentences
                    if not summary.endswith(('.', '!', '?')):
                        boundaries = [summary.rfind('.'), summary.rfind('!'), summary.rfind('?')]
                        last_boundary = max(boundaries)
                        
                        if last_boundary > len(summary) * 0.7:
                            summary = summary[:last_boundary + 1].strip()
                        else:
                            summary = summary.rstrip() + '.'
                    
                    final_words = len(summary.split())
                    
                    if final_words >= 120:
                        print(f"✅ AI SUCCESS: {final_words} words")
                        print(f"{'='*70}\n")
                        
                        return jsonify({
                            'summary': summary,
                            'method': 'ai',
                            'word_count': final_words,
                            'scraped': url and scraped_text is not None
                        })
                    else:
                        print(f"⚠️ AI too short ({final_words}), using fallback...")
            
        except Exception as e:
            print(f"❌ AI Error: {str(e)}")
    
    # STRATEGY 2: INTELLIGENT EXTRACTION
    print("\n📋 Using Enhanced Extraction...")
    
    import re
    
    sentence_pattern = r'([.!?]+)\s+'
    parts = re.split(sentence_pattern, text)
    
    sentences = []
    for i in range(0, len(parts)-1, 2):
        sentence = (parts[i] + (parts[i+1] if i+1 < len(parts) else '')).strip()
        word_count = len(sentence.split())
        
        if 8 <= word_count <= 70:
            sentences.append(sentence)
    
    print(f"📊 Found {len(sentences)} quality sentences")
    
    if not sentences:
        words = text.split()[:250]
        summary = ' '.join(words)
        if not summary.endswith(('.', '!', '?')):
            summary += '.'
        
        return jsonify({
            'summary': summary,
            'method': 'emergency',
            'word_count': len(summary.split())
        })
    
    # Take sentences to reach ~250 words
    selected = []
    current_words = 0
    target_words = 250
    
    for sentence in sentences[:25]:  # Max 25 sentences
        selected.append(sentence)
        current_words += len(sentence.split())
        
        if current_words >= target_words:
            break
    
    summary = ' '.join(selected)
    
    if not summary.endswith(('.', '!', '?')):
        summary += '.'
    
    final_word_count = len(summary.split())
    print(f"✅ EXTRACTION: {final_word_count} words, {len(selected)} sentences")
    print(f"{'='*70}\n")
    
    scraped_text = None
    return jsonify({
        'summary': summary,
        'method': 'intelligent_extraction',
        'word_count': final_word_count,
        'scraped': url and scraped_text is not None
    })

@app.route('/api/translate', methods=['POST'])
def translate():
    """
    Translate text to target language
    Body: { "text": "text to translate", "target_lang": "es" }
    """
    data = request.get_json()
    text = data.get('text', '')
    target_lang = data.get('target_lang', 'en')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    try:
        translated_text = translate_text(text, target_lang)
        
        return jsonify({
            'status': 'success',
            'original': text,
            'translated': translated_text,
            'target_language': target_lang,
            'language_name': LANGUAGE_NAMES.get(target_lang, target_lang)
        })
    except Exception as e:
        return jsonify({'error': f'Translation failed: {str(e)}'}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get available news categories"""
    categories = [
        {'id': 'general', 'name': 'General', 'icon': '📰'},
        {'id': 'business', 'name': 'Business', 'icon': '💼'},
        {'id': 'technology', 'name': 'Technology', 'icon': '💻'},
        {'id': 'entertainment', 'name': 'Entertainment', 'icon': '🎬'},
        {'id': 'sports', 'name': 'Sports', 'icon': '⚽'},
        {'id': 'science', 'name': 'Science', 'icon': '🔬'},
        {'id': 'health', 'name': 'Health', 'icon': '🏥'}
    ]
    return jsonify(categories)

@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Get supported languages for translation"""
    languages = [
        {'code': 'en', 'name': 'English', 'flag': '🇺🇸'},
        {'code': 'es', 'name': 'Spanish', 'flag': '🇪🇸'},
        {'code': 'fr', 'name': 'French', 'flag': '🇫🇷'},
        {'code': 'de', 'name': 'German', 'flag': '🇩🇪'},
        {'code': 'it', 'name': 'Italian', 'flag': '🇮🇹'},
        {'code': 'pt', 'name': 'Portuguese', 'flag': '🇵🇹'}
    ]
    return jsonify(languages)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🌧️  DailyDrizzle Backend Server")
    print("="*60)
    print(f"📍 Running on: http://localhost:5000")
    print(f"🔑 NewsAPI Key: {'✅ Configured' if NEWS_API_KEY else '❌ Missing'}")
    print(f"🤖 HuggingFace Key: {'✅ Configured' if HUGGINGFACE_API_KEY else '❌ Missing'}")
    print(f"🌐 Translation: ✅ Enabled (Google Translator)")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000)