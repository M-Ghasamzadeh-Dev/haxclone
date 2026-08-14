// =========================================================
// chat.js — نمایش و مدیریت پیام‌های چت
// =========================================================

export function createChat(chatBoxEl) {
  function log(team, text) {
    const div = document.createElement('div');
    if (team === 'red') div.style.color = '#ff8080';
    else if (team === 'blue') div.style.color = '#80b3ff';
    else { div.style.color = '#999'; div.style.fontStyle = 'italic'; }
    div.textContent = text;
    chatBoxEl.appendChild(div);
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
  }
  return { log };
}
