const toggle = document.getElementById('chatbotToggle');
const panel = document.getElementById('chatbotPanel');
const messagesEl = document.getElementById('chatbotMessages');
const form = document.getElementById('chatbotForm');
const input = document.getElementById('chatbotInput');

let conversation = [];
const MAX_MESSAGES = 20; // soft cap so one visitor can't rack up unlimited API calls

toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
});

function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${sender}`;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'chat-msg chat-msg-bot chat-typing';
    el.id = 'typingIndicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    if (conversation.length >= MAX_MESSAGES) {
        addMessage("We've reached the limit for this chat session — feel free to email Darwin directly for anything else!", 'bot');
        input.value = '';
        return;
    }

    addMessage(text, 'user');
    conversation.push({ role: 'user', content: text });
    input.value = '';
    input.disabled = true;
    addTypingIndicator();

    try {
        const res = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversation })
        });

        const data = await res.json();
        removeTypingIndicator();

        if (!res.ok || !data.reply) {
            addMessage("Sorry, something went wrong. Please try again in a moment.", 'bot');
        } else {
            addMessage(data.reply, 'bot');
            conversation.push({ role: 'assistant', content: data.reply });
        }
    } catch (err) {
        removeTypingIndicator();
        addMessage("Couldn't connect right now — please try again shortly.", 'bot');
    } finally {
        input.disabled = false;
        input.focus();
    }
});