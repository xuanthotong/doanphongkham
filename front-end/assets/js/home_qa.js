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

    // LỌC: Chỉ lấy những câu hỏi đã được trả lời để hiển thị ở trang chủ (Đóng vai trò như Knowledge Base)
    const answeredQA = questions.filter(q => q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== ''));
    
    // Giới hạn hiển thị 5 câu hỏi nổi bật/mới nhất cho gọn trang chủ
    const topQA = answeredQA.slice(0, 5);

    if (topQA.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px; font-size: 16px;">Hiện chưa có câu hỏi nào được giải đáp.</p>';
        return;
    }

    topQA.forEach((q) => {
        const div = document.createElement('div');
        div.className = 'faq-item';
        
        // Xử lý tên người trả lời
        const nguoiDaTraLoi = q.ten_nguoi_tra_loi 
            ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? `Quản trị viên - ${q.ten_nguoi_tra_loi}` : `BS. ${q.ten_nguoi_tra_loi}`) 
            : 'Bác sĩ chuyên khoa';

        // Tag chuyên khoa
        const chuyenKhoa = q.ten_chuyen_khoa ? `<span style="background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 12px; font-size: 12px; margin-left: 12px; font-weight: 600; white-space: nowrap;">${q.ten_chuyen_khoa}</span>` : '';

        // Xử lý tên người hỏi (Hiện tên thật hoặc chữ 'Ẩn danh')
        const tenNguoiHoi = q.nguoi_hoi ? q.nguoi_hoi : 'Ẩn danh';

        div.innerHTML = `
            <button class="faq-question">
                <div style="display: flex; align-items: center; text-align: left; padding-right: 15px; flex-wrap: wrap; gap: 8px;">
                    <span style="font-size: 16px; color: #0f172a;">${q.tieu_de || 'Câu hỏi từ bệnh nhân'}</span>
                    ${chuyenKhoa}
                </div>
                <div class="faq-icon-wrapper" style="background: #f0f9ff; min-width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.3s;">
                    <i class="fa-solid fa-chevron-down" style="font-size: 14px; color: #0284c7;"></i>
                </div>
            </button>
            <div class="faq-answer">
                <div style="padding: 0 24px 24px 24px;">
                    <div style="margin-bottom: 16px; color: #475569; font-size: 15px; line-height: 1.6; text-align: justify; padding-top: 10px;">
                        <strong style="color: #ef4444;">${tenNguoiHoi} hỏi:</strong> ${q.noi_dung}
                    </div>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 4px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <div style="width: 32px; height: 32px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                <i class="fa-solid fa-user-doctor"></i>
                            </div>
                            <strong style="color: #166534; font-size: 14px;">${nguoiDaTraLoi} giải đáp:</strong>
                        </div>
                        <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; text-align: justify; padding: 0 !important;">${q.tra_loi}</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Kêu gọi hành động (Call to action) ở cuối danh sách
    const footerDiv = document.createElement('div');
    footerDiv.style.textAlign = 'center';
    footerDiv.style.marginTop = '25px';
    footerDiv.innerHTML = `
        <p style="color: #64748b; margin-bottom: 12px; font-size: 14px;">Bạn có triệu chứng cần bác sĩ tư vấn?</p>
        <button class="btn btn-outline" onclick="requireLoginToBook(event)" style="border-radius: 20px;"><i class="fa-regular fa-comment-dots"></i> Đặt câu hỏi miễn phí</button>
    `;
    container.appendChild(footerDiv);

    // Gắn sự kiện click (Accordion) sau khi các thẻ đã được tạo xong
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Thu gọn tất cả các thẻ đang mở
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.faq-answer').style.maxHeight = null;
                const iconWrapper = item.querySelector('.faq-icon-wrapper');
                if(iconWrapper) {
                    iconWrapper.style.background = '#f0f9ff';
                    iconWrapper.querySelector('i').style.color = '#0284c7';
                }
            });
            
            // Mở thẻ vừa được click
            if (!isActive) {
                faqItem.classList.add('active');
                const answer = faqItem.querySelector('.faq-answer');
                answer.style.maxHeight = answer.scrollHeight + "px";
                
                // Đổi màu icon khi đang mở
                const iconWrapper = faqItem.querySelector('.faq-icon-wrapper');
                if(iconWrapper) {
                    iconWrapper.style.background = '#0284c7';
                    iconWrapper.querySelector('i').style.color = 'white';
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', fetchHomeQA);