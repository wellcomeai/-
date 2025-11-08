let chatHistory = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');

    // Обработка Enter для отправки (Shift+Enter для новой строки)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Автофокус на поле ввода
    userInput.focus();
});

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();

    if (!message) {
        return;
    }

    // Добавляем сообщение пользователя
    addMessage(message, 'user');

    // Очищаем поле ввода
    userInput.value = '';

    // Отключаем кнопку отправки
    setLoading(true);

    // Скрываем приветственное сообщение
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    // Добавляем индикатор загрузки
    const loadingId = addLoadingIndicator();

    try {
        // Получаем выбранную модель
        const model = document.getElementById('model-select').value;

        // Отправляем запрос к API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: model
            })
        });

        const data = await response.json();

        // Удаляем индикатор загрузки
        removeLoadingIndicator(loadingId);

        if (data.success) {
            addMessage(data.response, 'ai');
            updateStatus('Готов к общению');
        } else {
            addMessage(`Ошибка: ${data.error}`, 'ai', true);
            updateStatus('Произошла ошибка');
        }

    } catch (error) {
        removeLoadingIndicator(loadingId);
        addMessage(`Ошибка соединения: ${error.message}`, 'ai', true);
        updateStatus('Ошибка соединения');
    } finally {
        setLoading(false);
        userInput.focus();
    }
}

function addMessage(text, type, isError = false) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = type === 'user' ? 'Вы' : 'ИИ';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    if (isError) {
        content.style.color = '#ff6b6b';
    }

    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatContainer.appendChild(messageDiv);

    // Прокрутка вниз
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Сохраняем в историю
    chatHistory.push({ type, text });
}

function addLoadingIndicator() {
    const chatContainer = document.getElementById('chat-container');
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message ai-message';

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = 'ИИ';

    const content = document.createElement('div');
    content.className = 'message-content loading';
    content.innerHTML = `
        <span>Думаю</span>
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    loadingDiv.appendChild(label);
    loadingDiv.appendChild(content);
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    updateStatus('Обработка запроса...');

    return loadingId;
}

function removeLoadingIndicator(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

function setLoading(isLoading) {
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');

    sendButton.disabled = isLoading;
    userInput.disabled = isLoading;

    if (isLoading) {
        sendButton.querySelector('#send-text').textContent = 'Отправка...';
    } else {
        sendButton.querySelector('#send-text').textContent = 'Отправить';
    }
}

function updateStatus(text) {
    const status = document.getElementById('status');
    status.textContent = text;
}

function clearChat() {
    if (confirm('Вы уверены, что хотите очистить историю чата?')) {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать!</h2>
                <p>Начните общение с ИИ, написав сообщение ниже.</p>
                <div class="info-box">
                    <h3>ℹ️ Информация:</h3>
                    <ul>
                        <li>Используются бесплатные и открытые LLM модели через Hugging Face</li>
                        <li>Первый запрос может занять время (модель загружается)</li>
                        <li>API может иметь ограничения по количеству запросов</li>
                        <li>Для лучшей производительности получите бесплатный API ключ на huggingface.co</li>
                    </ul>
                </div>
            </div>
        `;
        chatHistory = [];
        updateStatus('Чат очищен');
    }
}

// Обработка изменения модели
document.addEventListener('DOMContentLoaded', function() {
    const modelSelect = document.getElementById('model-select');
    modelSelect.addEventListener('change', function() {
        updateStatus(`Выбрана модель: ${this.options[this.selectedIndex].text}`);
    });
});
