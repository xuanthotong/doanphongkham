async function fetchHomeQA() {
    try {
        const response = await fetch('http://localhost:3000/api/questions');
        const questions = await response.json();
        renderHomeQA(questions);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỏi đáp:', error);
    }
}

function renderHomeQA(questions) {
    const container = document.getElementById('faq-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (!questions || questions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px; font-size: 16px;">Hiện chưa có hỏi đáp nào.</p>';
        return;
    }

    questions.forEach((q) => {
        const div = document.createElement('div');
        div.className = 'faq-item';
        
        const traLoiHTML = q.trang_thai // `da_giai_quyet` là kiểu BIT (true/false)
            ? `<p style="color: var(--text-dark);"><strong>Bác sĩ trả lời:</strong> ${q.tra_loi}</p>` 
            : `<p style="color: #d97706;"><em>Câu hỏi đang chờ bác sĩ chuyên khoa trả lời...</em></p>`;

        div.innerHTML = `
            <button class="faq-question">${q.tieu_de || 'Câu hỏi từ bệnh nhân'} <i class="fa-solid fa-chevron-down"></i></button>
            <div class="faq-answer">
                <p style="padding-top: 15px;"><strong>Hỏi:</strong> ${q.noi_dung}</p>
                ${traLoiHTML}
            </div>
        `;
        container.appendChild(div);
    });

    // Gắn sự kiện click (Accordion) sau khi các thẻ đã được tạo xong
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.faq-answer').style.maxHeight = null;
            });
            if (!isActive) {
                faqItem.classList.add('active');
                const answer = faqItem.querySelector('.faq-answer');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', fetchHomeQA);