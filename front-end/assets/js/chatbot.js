window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
// ============================================
// CHATBOT FRONTEND - TT Medical AI
// ============================================

(function() {
    'use strict';

    const API_BASE = window.API_BASE + '/api/chatbot';

    // Tạo phiên chat duy nhất cho mỗi tab trình duyệt
    let PHIEN_ID = sessionStorage.getItem('chatbot_phien_id');
    if (!PHIEN_ID) {
        PHIEN_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('chatbot_phien_id', PHIEN_ID);
    }

    // Lấy thông tin user đang đăng nhập (nếu có)
    // Key trong localStorage: 'userInfo' (bệnh nhân), 'doctorInfo' (bác sĩ), 'adminInfo' (admin)
    const getUserInfo = () => {
        try {
            const raw = localStorage.getItem('userInfo')
                     || localStorage.getItem('doctorInfo')
                     || localStorage.getItem('adminInfo');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    };

    // ============================================
    // INJECT HTML CHATBOT VÀO TRANG
    // ============================================
    const injectChatbotHTML = () => {
        const html = `
        <!-- NÚT CHAT NỔI -->
        <button class="chatbot-toggle" id="chatbotToggle" onclick="toggleChatbot()" title="Chat với TT Medical AI">
            <i class="fa-solid fa-comment-medical"></i>
            <span class="chatbot-badge" id="chatbotBadge">1</span>
        </button>

        <!-- CỬA SỔ CHAT -->
        <div class="chatbot-window" id="chatbotWindow">
            <div class="chatbot-header">
                <div class="chatbot-header-avatar">🤖</div>
                <div class="chatbot-header-info">
                    <h4>TT Medical AI</h4>
                    <p><span class="chatbot-header-dot"></span>Trực tuyến 24/7</p>
                </div>
                <div class="chatbot-header-actions">
                    <button onclick="resetChatbot()" title="Cuộc hội thoại mới"><i class="fa-solid fa-rotate-right"></i></button>
                    <button onclick="toggleChatbot()" title="Đóng"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>

            <div class="chatbot-messages" id="chatbotMessages">
                <!-- Tin nhắn sẽ được JS đổ vào đây -->
            </div>

            <div class="chatbot-suggestions" id="chatbotSuggestions">
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">📋 Cách đặt lịch khám?</button>
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">🏥 Có chuyên khoa nào?</button>
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">📅 Lịch làm việc bác sĩ?</button>
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">💊 Đơn thuốc của tôi?</button>
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">📄 Lịch sử khám bệnh?</button>
                <button class="chatbot-suggestion-btn" onclick="sendSuggestion(this)">💰 Phí khám bao nhiêu?</button>
            </div>

            <div class="chatbot-input-area">
                <input type="text" id="chatbotInput" placeholder="Nhập câu hỏi về sức khỏe..." 
                       onkeydown="if(event.key==='Enter') sendChatMessage()" autocomplete="off">
                <button class="chatbot-send-btn" id="chatbotSendBtn" onclick="sendChatMessage()" title="Gửi">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    };

    // ============================================
    // MỞ / ĐÓNG CỬA SỔ CHAT
    // ============================================
    window.toggleChatbot = function() {
        const win = document.getElementById('chatbotWindow');
        const btn = document.getElementById('chatbotToggle');
        const badge = document.getElementById('chatbotBadge');
        const icon = btn.querySelector('i');

        if (win.classList.contains('open')) {
            win.classList.remove('open');
            btn.classList.remove('active');
            icon.className = 'fa-solid fa-comment-medical';
        } else {
            win.classList.add('open');
            btn.classList.add('active');
            icon.className = 'fa-solid fa-xmark';
            badge.style.display = 'none';

            // Lần đầu mở → hiển thị tin nhắn chào mừng
            const messages = document.getElementById('chatbotMessages');
            if (messages.children.length === 0) {
                showWelcomeMessage();
            }

            // Focus vào ô nhập
            setTimeout(() => document.getElementById('chatbotInput').focus(), 300);
            scrollToBottom();
        }
    };

    // ============================================
    // TIN NHẮN CHÀO MỪNG
    // ============================================
    const showWelcomeMessage = () => {
        const user = getUserInfo();
        const tenUser = user ? user.ho_ten || user.ten_dang_nhap : '';
        const greeting = tenUser ? `Xin chào **${tenUser}**! 👋` : 'Xin chào bạn! 👋';
        
        const welcomeText = `${greeting}\n\nTôi là **TT Medical AI** — trợ lý y tế ảo của phòng khám TT Medical.\n\nTôi có thể giúp bạn:\n• 🏥 Thông tin chuyên khoa và bác sĩ\n• 📅 Lịch làm việc bác sĩ sắp tới\n• 📋 Hướng dẫn đặt lịch khám\n• 📄 Xem lịch sử khám bệnh của bạn\n• 💊 Xem đơn thuốc/ghi chú bác sĩ\n• 💰 Phí khám và thanh toán\n\nHãy hỏi tôi bất cứ điều gì nhé!`;
        
        appendMessage('bot', 'TT Medical AI', welcomeText);
    };

    // ============================================
    // GỬI TIN NHẮN
    // ============================================
    window.sendChatMessage = async function() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        if (!message) return;

        const user = getUserInfo();
        const tenNguoiGui = user ? (user.ho_ten || user.ten_dang_nhap) : 'Khách';
        const taiKhoanId = user ? user.id : null;

        // Hiển thị tin nhắn user
        appendMessage('user', tenNguoiGui, message);
        input.value = '';
        input.focus();

        // Ẩn gợi ý sau khi gửi tin đầu tiên
        const suggestions = document.getElementById('chatbotSuggestions');
        if (suggestions) suggestions.style.display = 'none';

        // Hiển thị typing indicator
        showTypingIndicator();

        try {
            const response = await fetch(`${API_BASE}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    phien_id: PHIEN_ID,
                    tai_khoan_id: taiKhoanId,
                    nguoi_gui: tenNguoiGui
                })
            });

            const data = await response.json();
            hideTypingIndicator();
            appendMessage('bot', data.nguoi_gui || 'TT Medical AI', data.reply);

        } catch (error) {
            hideTypingIndicator();
            appendMessage('bot', 'TT Medical AI', 'Xin lỗi, có lỗi kết nối đến server. Vui lòng thử lại sau hoặc gọi hotline 1900 6868! 🙏');
        }
    };

    // ============================================
    // GỬI GỢI Ý NHANH
    // ============================================
    window.sendSuggestion = function(btn) {
        const input = document.getElementById('chatbotInput');
        // Lấy text bỏ emoji đầu
        input.value = btn.textContent.replace(/^[^\w\sÀ-ỹ]+\s*/, '').trim();
        sendChatMessage();
    };

    // ============================================
    // HIỂN THỊ TIN NHẮN
    // ============================================
    const appendMessage = (type, senderName, text) => {
        const container = document.getElementById('chatbotMessages');
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type}`;

        // Avatar
        const avatarIcon = type === 'bot' ? '🤖' : '👤';
        
        // Format markdown đơn giản (bold, list)
        let formattedText = escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n• /g, '<br>• ')
            .replace(/\n- /g, '<br>- ')
            .replace(/\n\d+\. /g, (match) => '<br>' + match.trim() + ' ')
            .replace(/\n/g, '<br>');

        msgDiv.innerHTML = `
            <div class="chat-msg-avatar">${avatarIcon}</div>
            <div class="chat-msg-content">
                <span class="chat-msg-name">${escapeHtml(senderName)}</span>
                <div class="chat-msg-bubble">${formattedText}</div>
            </div>
        `;

        container.appendChild(msgDiv);
        scrollToBottom();
    };

    // ============================================
    // TYPING INDICATOR
    // ============================================
    const showTypingIndicator = () => {
        const container = document.getElementById('chatbotMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-msg bot';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="chat-msg-avatar">🤖</div>
            <div class="chat-msg-content">
                <span class="chat-msg-name">TT Medical AI</span>
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        container.appendChild(typingDiv);
        scrollToBottom();

        // Disable nút gửi khi bot đang trả lời
        document.getElementById('chatbotSendBtn').disabled = true;
    };

    const hideTypingIndicator = () => {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
        document.getElementById('chatbotSendBtn').disabled = false;
    };

    // ============================================
    // RESET CUỘC HỘI THOẠI
    // ============================================
    window.resetChatbot = async function() {
        try {
            await fetch(`${API_BASE}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phien_id: PHIEN_ID })
            });
        } catch (e) { /* ignore */ }

        // Tạo phiên mới
        PHIEN_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('chatbot_phien_id', PHIEN_ID);

        // Xóa tin nhắn cũ
        document.getElementById('chatbotMessages').innerHTML = '';

        // Hiện lại gợi ý
        const suggestions = document.getElementById('chatbotSuggestions');
        if (suggestions) suggestions.style.display = 'flex';

        // Hiện tin chào mừng mới
        showWelcomeMessage();
    };

    // ============================================
    // TIỆN ÍCH
    // ============================================
    const scrollToBottom = () => {
        const container = document.getElementById('chatbotMessages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ============================================
    // KHỞI TẠO KHI TRANG LOAD XONG
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatbotHTML);
    } else {
        injectChatbotHTML();
    }

})();


