let questions = []; 
const qaTbody = document.getElementById('qaTableBody');

// HÀM LẤY CÂU HỎI TỪ CƠ SỞ DỮ LIỆU
async function fetchQuestions() {
    try {
        const response = await fetch('http://localhost:3000/api/questions');
        questions = await response.json();
        renderQATable();
    } catch (error) {
        console.error("Lỗi lấy câu hỏi:", error);
    }
}

function renderQATable() {
    if (!qaTbody) return;
    qaTbody.innerHTML = '';
    
    if (questions.length === 0) {
        qaTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có câu hỏi nào từ người dùng.</td></tr>`;
        return;
    }

    questions.forEach((q) => {
        const statusBadge = q.trang_thai == 1 || q.tra_loi
            ? `<span class="badge" style="background-color: #dcfce7; color: #166534;">Đã trả lời</span>` 
            : `<span class="badge" style="background-color: #fef08a; color: #854d0e;">Chưa trả lời</span>`;

        const date = new Date(q.ngay_tao || Date.now());
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        // XỬ LÝ LOGIC HIỂN THỊ NGƯỜI TRẢ LỜI Ở ĐÂY
        let nguoiTraLoi = 'Chưa có';
        if (q.tra_loi) {
            // Nếu có tên người trả lời trong CSDL
            if (q.ten_nguoi_tra_loi) {
                if (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên') {
                    nguoiTraLoi = `<span style="color: #ef4444; font-weight: 700;">Admin - ${q.ten_nguoi_tra_loi}</span>`;
                } else {
                    nguoiTraLoi = `<span style="color: #0284c7; font-weight: 600;">BS. ${q.ten_nguoi_tra_loi}</span>`;
                }
            } else {
                // Backup cho những câu trả lời cũ chưa được lưu ID
                nguoiTraLoi = q.vai_tro_tra_loi === 'Admin' ? '<span style="color: #ef4444; font-weight: 700;">Admin</span>' : '<span style="color: #0284c7; font-weight: 600;">Bác sĩ</span>';
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--primary-color);">#${q.id}</td>
            <td style="font-weight: 600;">${q.nguoi_hoi || 'Ẩn danh'}</td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1; white-space:nowrap;">${q.ten_chuyen_khoa || 'Chung'}</span></td>
            <td style="white-space: normal; max-width: 150px; font-weight: 500;">${q.tieu_de}</td>
            <td style="white-space: normal; max-width: 250px; color: #4b5563;">${q.noi_dung}</td>
            
            <td>${nguoiTraLoi}</td>
            
            <td style="white-space: normal; max-width: 250px; color: #10b981; font-weight: 500;">${q.tra_loi || ''}</td>
            <td>${dateStr}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="replyQA(${q.id})" title="Trả lời Bệnh nhân"><i class="fa-solid fa-reply"></i></button>
                <button class="action-btn delete" onclick="deleteQA(${q.id})" title="Xóa câu hỏi"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        qaTbody.appendChild(tr);
    });
}

async function replyQA(id) {
    const q = questions.find(item => item.id === id);
    if(!q) return;
    
    // LẤY THÔNG TIN ADMIN ĐANG ĐĂNG NHẬP ĐỂ TRẢ LỜI CÂU HỎI
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

    Swal.fire({
        title: 'Trả lời Bệnh nhân',
        input: 'textarea',
        inputLabel: 'Nhập câu trả lời của Bác sĩ/Admin:',
        inputValue: q.tra_loi || '',
        showCancelButton: true,
        confirmButtonColor: '#0284C7',
        confirmButtonText: 'Gửi trả lời',
        cancelButtonText: 'Hủy',
        inputValidator: (value) => {
            if (!value) return 'Vui lòng nhập nội dung trả lời!'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/questions/${id}/reply`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    // ĐÃ SỬA: Gửi kèm ID người trả lời và Vai trò lên Backend
                    body: JSON.stringify({ 
                        tra_loi: result.value,
                        nguoi_tra_loi_id: adminInfo.id,
                        vai_tro: adminInfo.role || 'Admin'
                    })
                });
                if (res.ok) {
                    Swal.fire('Đã gửi!', 'Câu trả lời đã được lưu.', 'success');
                    fetchQuestions(); 
                } else Swal.fire('Lỗi', 'Không thể trả lời!', 'error');
            } catch(e) { console.error(e); }
        }
    });
}

async function deleteQA(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: "Câu hỏi này sẽ bị xóa khỏi hệ thống!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/questions/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Xóa câu hỏi thành công.', 'success');
                    fetchQuestions();
                } else Swal.fire('Lỗi', 'Không thể xóa!', 'error');
            } catch(e) { console.error(e); }
        }
    });
}

fetchQuestions();