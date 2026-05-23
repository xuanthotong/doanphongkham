// =========================================================================================
// QUẢN LÝ BỆNH NHÂN (ADMIN) - admin_patient.js
// Dựa trên dữ liệu các Lịch hẹn đã khám (Hồ sơ y tế)
// =========================================================================================
let allPatients = [];
let currentPatientPage = 1;
const patientItemsPerPage = 10;

// 1. FETCH DỮ LIỆU TỪ API (Tái sử dụng API appointments nhưng chỉ lấy trạng thái 'done')
async function fetchAdminPatients() {
    try {
        const response = await fetch('https://doanphongkham.onrender.com/api/appointments');
        const data = await response.json();
        
        // Chỉ lấy các hồ sơ đã khám xong
        allPatients = data.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'done');
        renderPatientTable();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu bệnh nhân:', error);
    }
}

// Hàm trích xuất Chẩn đoán từ ghi chú
function extractDiagnosis(note) {
    if (!note) return 'Chưa có kết luận';
    const match = note.match(/\[Chẩn đoán\]:\s*(.*?)(?=\n|$)/);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Nếu không có format [Chẩn đoán]: thì lấy dòng đầu tiên hoặc mặc định
    return note.split('\n')[0] || 'Chưa có kết luận';
}

// 2. RENDER BẢNG HỒ SƠ BỆNH NHÂN
function renderPatientTable() {
    const tbody = document.getElementById('patientTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Chưa có ô search riêng cho bệnh nhân, tạm thời bỏ qua hoặc gắn nếu user yêu cầu
    
    if (allPatients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không có hồ sơ y tế nào.</td></tr>`;
        return;
    }

    // Phân trang
    const totalPages = Math.ceil(allPatients.length / patientItemsPerPage);
    if (currentPatientPage > totalPages) currentPatientPage = totalPages;
    if (currentPatientPage < 1) currentPatientPage = 1;

    const startIndex = (currentPatientPage - 1) * patientItemsPerPage;
    const paginatedPatients = allPatients.slice(startIndex, startIndex + patientItemsPerPage);

    paginatedPatients.forEach(app => {
        // Xử lý triệu chứng và bóc tách hình ảnh (do frontend lưu ảnh base64 vào thẳng mo_ta_trieu_chung)
        let trieuChungText = app.mo_ta_trieu_chung || '';
        let extractedImages = [];
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(trieuChungText)) !== null) {
            extractedImages.push(match[1]);
        }
        
        // Loại bỏ phần HTML ra khỏi chuỗi triệu chứng để hiển thị text thuần
        trieuChungText = trieuChungText.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
        trieuChungText = trieuChungText.replace(/<[^>]*>?/gm, ''); // Xóa thẻ HTML còn sót

        // Hình ảnh triệu chứng
        let imgBtnHtml = '';
        if (app.hinh_anh_benh_ly) {
            const imgUrl = app.hinh_anh_benh_ly.startsWith('http') ? app.hinh_anh_benh_ly : `https://doanphongkham.onrender.com/uploads/${app.hinh_anh_benh_ly}`;
            imgBtnHtml = `<button class="action-btn" onclick="openPatientImage('${imgUrl}')" title="Xem hình ảnh" style="background-color: #0ea5e9; color: white;"><i class="fa-solid fa-image"></i> Xem</button>`;
        } else if (extractedImages.length > 0) {
            imgBtnHtml = `<button class="action-btn" onclick="openPatientImage('${extractedImages[0]}')" title="Xem hình ảnh" style="background-color: #0ea5e9; color: white;"><i class="fa-solid fa-image"></i> Xem</button>`;
        } else {
            imgBtnHtml = `<span style="color:#9ca3af; font-size:12px;">Không có</span>`;
        }

        // Chẩn đoán & Ghi chú
        const diagnosis = extractDiagnosis(app.ghi_chu_cua_bac_si);
        let note = app.ghi_chu_cua_bac_si || 'Không có';
        if (note.length > 30) note = note.substring(0, 30) + '...';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: var(--primary-color);">#LK${app.id}</strong></td>
            <td style="font-weight: 600;">${app.ten_benh_nhan}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${trieuChungText}">${trieuChungText || '<span style="color:#9ca3af;">Không nhập</span>'}</td>
            <td>${imgBtnHtml}</td>
            <td><span style="color:#ef4444; font-weight:600;">${diagnosis}</span></td>
            <td title="${app.ghi_chu_cua_bac_si || ''}">${note}</td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">Đã hoàn thành</span></td>
            <td>
                <button class="action-btn edit" onclick="viewMedicalRecordDetail(${app.id})" title="Xem chi tiết hồ sơ"><i class="fa-solid fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPatientPagination(totalPages);
}

// 3. PHÂN TRANG BỆNH NHÂN
function renderPatientPagination(totalPages) {
    let container = document.getElementById('admin_patient_pagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin_patient_pagination';
        container.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; width: 100%;';
        const tbody = document.getElementById('patientTableBody');
        if (tbody) {
            const table = tbody.closest('table');
            if (table && table.parentNode) {
                table.parentNode.insertBefore(container, table.nextSibling);
            }
        }
    }

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    if (currentPatientPage > 1) {
        html += `<button onclick="changePatientPage(${currentPatientPage - 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&laquo;</button>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPatientPage) {
            html += `<button style="padding: 6px 12px; border: 1px solid #0284c7; background: #0284c7; color: white; border-radius: 6px; font-weight: bold; cursor: default;">${i}</button>`;
        } else {
            html += `<button onclick="changePatientPage(${i})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">${i}</button>`;
        }
    }
    if (currentPatientPage < totalPages) {
        html += `<button onclick="changePatientPage(${currentPatientPage + 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&raquo;</button>`;
    }
    container.innerHTML = html;
}

function changePatientPage(page) {
    currentPatientPage = page;
    renderPatientTable();
}

// 4. XEM CHI TIẾT HỒ SƠ
function viewMedicalRecordDetail(id) {
    const app = allPatients.find(a => a.id === id);
    if (!app) return;

    let trieuChungText = app.mo_ta_trieu_chung || '';
    trieuChungText = trieuChungText.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
    trieuChungText = trieuChungText.replace(/<[^>]*>?/gm, '');

    Swal.fire({
        title: `Hồ sơ y tế #${app.id}`,
        html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                <p><strong>Bệnh nhân:</strong> ${app.ten_benh_nhan}</p>
                <p><strong>Bác sĩ khám:</strong> BS. ${app.ten_bac_si || 'Không rõ'}</p>
                <p><strong>Ngày khám:</strong> ${app.ngay_lam_viec ? new Date(app.ngay_lam_viec).toLocaleDateString('vi-VN') : ''}</p>
                <p><strong>Triệu chứng:</strong> ${trieuChungText || 'Không có'}</p>
                <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
                <p><strong>Ghi chú / Đơn thuốc của bác sĩ:</strong></p>
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; font-family: monospace;">${app.ghi_chu_cua_bac_si || 'Chưa có ghi chú'}</div>
            </div>
        `,
        width: '600px',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#10b981'
    });
}

// 5. HÀM XEM ẢNH BẰNG SWEETALERT
window.openPatientImage = function(imgSrc) {
    Swal.fire({
        title: 'Hình ảnh triệu chứng',
        imageUrl: imgSrc,
        imageAlt: 'Triệu chứng',
        width: 'auto',
        showCloseButton: true,
        showConfirmButton: false
    });
}

// Gọi API khi load script
document.addEventListener('DOMContentLoaded', () => {
    fetchAdminPatients();
});
