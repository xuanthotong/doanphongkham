let questions = []; 
const qaTbody = document.getElementById('qaTableBody');

// HÀM LẤY CÂU HỎI TỪ CƠ SỞ DỮ LIỆU
async function fetchQuestions() {
    try {
        // [TƯƠNG LAI]: Mở comment để fetch API
        // const response = await fetch('http://localhost:3000/api/questions');
        // questions = await response.json();

        // [HIỆN TẠI]: Dữ liệu giả lập (Sau này XÓA đoạn này đi)
        questions = [
            { id: 1, ma_ch: "#QA102", benh_nhan: "Nguyễn Văn A", chuyen_khoa: "Tai Mũi Họng", tieu_de: "Viêm họng hạt", noi_dung: "Bác sĩ cho em hỏi dạo này nuốt nước bọt đau rát thì uống thuốc gì ạ?", bac_si: "Chưa phân công", tra_loi: "", ngay_gui: "16/04/2026", trang_thai: 0 }
        ];
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
        const statusBadge = q.trang_thai == 1 
            ? `<span class="badge" style="background-color: #dcfce7; color: #166534;">Đã trả lời</span>` 
            : `<span class="badge" style="background-color: #fef08a; color: #854d0e;">Chưa trả lời</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--primary-color);">${q.ma_ch}</td>
            <td style="font-weight: 600;">${q.benh_nhan}</td>
            <td>${q.chuyen_khoa}</td>
            <td style="white-space: normal; max-width: 150px; font-weight: 500;">${q.tieu_de}</td>
            <td style="white-space: normal; max-width: 250px; color: #4b5563;">${q.noi_dung}</td>
            <td>${q.bac_si}</td>
            <td style="white-space: normal; max-width: 250px; color: #10b981; font-weight: 500;">${q.tra_loi}</td>
            <td>${q.ngay_gui}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="replyQA(${q.id})" title="Trả lời Bệnh nhân"><i class="fa-solid fa-reply"></i></button>
                <button class="action-btn delete" onclick="deleteQA(${q.id})" title="Xóa câu hỏi"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        qaTbody.appendChild(tr);
    });
}

// [TƯƠNG LAI]: Hàm gọi API lưu câu trả lời của Bác sĩ vào CSDL
async function replyQA(id) {
    const q = questions.find(item => item.id === id);
    if(!q) return;
    
    let answer = prompt("Nhập câu trả lời của Bác sĩ:", q.tra_loi);
    if(answer !== null && answer.trim() !== "") {
        // VD API: await fetch(`/api/questions/${id}/reply`, { method: 'POST', body: JSON.stringify({ tra_loi: answer }) });
        
        q.tra_loi = answer;
        q.bac_si = "Admin (Đã TL)";
        q.trang_thai = 1; // 1 = Đã giải quyết
        renderQATable();
    }
}

// [TƯƠNG LAI]: Hàm gọi API xóa câu hỏi khỏi CSDL
async function deleteQA(id) {
    if(confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi hệ thống?")) {
        // VD API: await fetch(`/api/questions/${id}`, { method: 'DELETE' });
        questions = questions.filter(q => q.id !== id);
        renderQATable();
    }
}

fetchQuestions();