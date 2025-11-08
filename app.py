from flask import Flask, render_template, request, jsonify, stream_with_context, Response
import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = Flask(__name__)

# Hugging Face API настройки
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY', '')
DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

# Альтернативные бесплатные модели
AVAILABLE_MODELS = {
    "mistral": "mistralai/Mistral-7B-Instruct-v0.2",
    "llama": "meta-llama/Llama-2-7b-chat-hf",
    "falcon": "tiiuae/falcon-7b-instruct",
    "phi": "microsoft/phi-2",
    "gemma": "google/gemma-7b-it"
}

@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html', models=AVAILABLE_MODELS)

@app.route('/api/chat', methods=['POST'])
def chat():
    """API endpoint для отправки сообщений в LLM"""
    try:
        data = request.json
        user_message = data.get('message', '')
        model_key = data.get('model', 'mistral')

        if not user_message:
            return jsonify({'error': 'Сообщение не может быть пустым'}), 400

        model_name = AVAILABLE_MODELS.get(model_key, DEFAULT_MODEL)

        # Вызов Hugging Face Inference API
        response = call_huggingface_api(user_message, model_name)

        return jsonify({
            'success': True,
            'response': response,
            'model': model_name
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """API endpoint для потоковой передачи ответов"""
    try:
        data = request.json
        user_message = data.get('message', '')
        model_key = data.get('model', 'mistral')

        if not user_message:
            return jsonify({'error': 'Сообщение не может быть пустым'}), 400

        model_name = AVAILABLE_MODELS.get(model_key, DEFAULT_MODEL)

        def generate():
            try:
                response = call_huggingface_api(user_message, model_name, stream=True)
                for chunk in response:
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(stream_with_context(generate()), mimetype='text/event-stream')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def call_huggingface_api(message, model_name, stream=False):
    """Вызов Hugging Face Inference API"""

    # Если нет API ключа, используем публичный endpoint (с ограничениями)
    if HUGGINGFACE_API_KEY:
        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
    else:
        headers = {
            "Content-Type": "application/json"
        }

    api_url = f"https://api-inference.huggingface.co/models/{model_name}"

    # Формируем промпт
    payload = {
        "inputs": message,
        "parameters": {
            "max_new_tokens": 512,
            "temperature": 0.7,
            "top_p": 0.95,
            "do_sample": True,
            "return_full_text": False
        }
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()

        # Обработка различных форматов ответов
        if isinstance(result, list) and len(result) > 0:
            if 'generated_text' in result[0]:
                return result[0]['generated_text']
            elif 'summary_text' in result[0]:
                return result[0]['summary_text']
        elif isinstance(result, dict):
            if 'generated_text' in result:
                return result['generated_text']
            elif 'error' in result:
                # Модель может загружаться
                if 'loading' in result['error'].lower():
                    return "Модель загружается, попробуйте снова через несколько секунд..."
                return f"Ошибка API: {result['error']}"

        return str(result)

    except requests.exceptions.Timeout:
        return "Превышено время ожидания ответа. Попробуйте снова."
    except requests.exceptions.RequestException as e:
        return f"Ошибка при обращении к API: {str(e)}"
    except Exception as e:
        return f"Неожиданная ошибка: {str(e)}"

@app.route('/api/models', methods=['GET'])
def get_models():
    """Получить список доступных моделей"""
    return jsonify({
        'models': AVAILABLE_MODELS
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
