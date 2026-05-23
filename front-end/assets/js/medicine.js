// =========================================================================================
// QUẢN LÝ THUỐC (ADMIN) - medicine.js
// =========================================================================================
let allMedicines = [];
let currentMedicinePage = 1;
const medicineItemsPerPage = 15;

// 1. FETCH DỮ LIỆU THUỐC TỪ API
async function fetchMedicines() {
    try {
        const response = await fetch(`${window.API_BASE}/api/thuoc`);
        allMedicines = await response.json();
        renderMedicineTable();
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thuốc:', error);
    }
}

// 2. RENDER BẢNG THUỐC VỚI TÌM KIẾM + PHÂN TRANG
function renderMedicineTable() {
    const tbody = document.getElementById('medicineTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchInput = document.getElementById('searchAdminMedicine');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const statusInput = document.getElementById('filterMedicineStatus');
    const filterStatus = statusInput ? statusInput.value : '';

    // Reset về trang 1 khi thay đổi bộ lọc
    if (window.lastMedicineKeyword !== keyword || window.lastMedicineStatus !== filterStatus) {
        currentMedicinePage = 1;
        window.lastMedicineKeyword = keyword;
        window.lastMedicineStatus = filterStatus;
    }

    let filtered = allMedicines;

    // Lọc theo trạng thái
    if (filterStatus !== '') {
        const isStock = filterStatus === '1';
        filtered = filtered.filter(m => Boolean(m.trang_thai) === isStock);
    }

    // Tìm kiếm theo tên thuốc, đơn vị
    if (keyword) {
        filtered = filtered.filter(m =>
            (m.ten_thuoc && m.ten_thuoc.toLowerCase().includes(keyword)) ||
            (m.don_vi && m.don_vi.toLowerCase().includes(keyword)) ||
            `t${m.id}`.includes(keyword)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy thuốc phù hợp.</td></tr>`;
        let paginationContainer = document.getElementById('admin_medicine_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    // Phân trang
    const totalPages = Math.ceil(filtered.length / medicineItemsPerPage);
    if (currentMedicinePage > totalPages) currentMedicinePage = totalPages;
    if (currentMedicinePage < 1) currentMedicinePage = 1;
    const startIndex = (currentMedicinePage - 1) * medicineItemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + medicineItemsPerPage);

    paginated.forEach(med => {
        const statusHtml = med.trang_thai
            ? `<span class="badge" style="background:#dcfce7; color:#166534;">Còn thuốc</span>`
            : `<span class="badge" style="background:#fee2e2; color:#991b1b;">Hết thuốc</span>`;

        const giaFormatted = Number(med.gia_thuoc || 0).toLocaleString('vi-VN');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: var(--primary-color);">#T${med.id}</strong></td>
            <td style="font-weight: 600;">${med.ten_thuoc}</td>
            <td>${med.don_vi}</td>
            <td style="color: #0284c7; font-weight: 600;">${giaFormatted} đ</td>
            <td>${med.lieu_dung_mac_dinh || '<span style="color:#94a3b8;">Chưa nhập</span>'}</td>
            <td title="${med.huong_dan_su_dung || ''}">${med.huong_dan_su_dung ? (med.huong_dan_su_dung.length > 40 ? med.huong_dan_su_dung.substring(0, 40) + '...' : med.huong_dan_su_dung) : '<span style="color:#94a3b8;">Chưa nhập</span>'}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn edit" onclick="openMedicineModal(${med.id})" title="Sửa thuốc"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteMedicine(${med.id})" title="Xóa thuốc"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderMedicinePagination(totalPages);
}

// 3. PHÂN TRANG
function renderMedicinePagination(totalPages) {
    let container = document.getElementById('admin_medicine_pagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin_medicine_pagination';
        container.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; width: 100%;';
        const tbody = document.getElementById('medicineTableBody');
        if (tbody) {
            const table = tbody.closest('table');
            if (table && table.parentNode) {
                table.parentNode.insertBefore(container, table.nextSibling);
            }
        }
    }

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    if (currentMedicinePage > 1) {
        html += `<button onclick="changeMedicinePage(${currentMedicinePage - 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&laquo;</button>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentMedicinePage) {
            html += `<button style="padding: 6px 12px; border: 1px solid #0284c7; background: #0284c7; color: white; border-radius: 6px; font-weight: bold; cursor: default;">${i}</button>`;
        } else {
            html += `<button onclick="changeMedicinePage(${i})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">${i}</button>`;
        }
    }
    if (currentMedicinePage < totalPages) {
        html += `<button onclick="changeMedicinePage(${currentMedicinePage + 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&raquo;</button>`;
    }
    container.innerHTML = html;
}

function changeMedicinePage(page) {
    currentMedicinePage = page;
    renderMedicineTable();
}

// 4. MỞ MODAL THÊM / SỬA THUỐC
function openMedicineModal(id = null) {
    const modal = document.getElementById('medicineModal');
    const title = document.getElementById('medicineModalTitle');
    const form = document.getElementById('medicineForm');

    form.reset();
    document.getElementById('m_id').value = '';

    if (id) {
        const med = allMedicines.find(m => m.id === id);
        if (!med) return;
        title.textContent = 'Sửa thông tin Thuốc';
        document.getElementById('m_id').value = med.id;
        document.getElementById('m_ten_thuoc').value = med.ten_thuoc;
        document.getElementById('m_don_vi').value = med.don_vi;
        document.getElementById('m_gia_thuoc').value = med.gia_thuoc || 0;
        document.getElementById('m_lieu_dung').value = med.lieu_dung_mac_dinh || '';
        document.getElementById('m_huong_dan').value = med.huong_dan_su_dung || '';
        document.getElementById('m_trang_thai').value = med.trang_thai ? '1' : '0';
        document.getElementById('m_trang_thai_group').style.display = 'block';
    } else {
        title.textContent = 'Thêm mới Thuốc';
        document.getElementById('m_trang_thai_group').style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeMedicineModal() {
    document.getElementById('medicineModal').style.display = 'none';
}

// 5. LƯU THUỐC (THÊM MỚI HOẶC CẬP NHẬT)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('medicineForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const id = document.getElementById('m_id').value;
            const data = {
                ten_thuoc: document.getElementById('m_ten_thuoc').value.trim(),
                don_vi: document.getElementById('m_don_vi').value.trim(),
                gia_thuoc: parseFloat(document.getElementById('m_gia_thuoc').value) || 0,
                lieu_dung_mac_dinh: document.getElementById('m_lieu_dung').value.trim(),
                huong_dan_su_dung: document.getElementById('m_huong_dan').value.trim(),
            };

            if (id) {
                data.trang_thai = parseInt(document.getElementById('m_trang_thai').value);
            }

            if (!data.ten_thuoc || !data.don_vi) {
                Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ Tên thuốc và Đơn vị!', 'warning');
                return;
            }

            try {
                const url = id ? `${window.API_BASE}/api/thuoc/${id}` : `${window.API_BASE}/api/thuoc`;
                const method = id ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                if (res.ok) {
                    closeMedicineModal();
                    Swal.fire('Thành công!', result.message, 'success');
                    fetchMedicines();
                } else {
                    Swal.fire('Lỗi!', result.message, 'error');
                }
            } catch (error) {
                console.error('Lỗi lưu thuốc:', error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        });
    }

    // Fetch dữ liệu thuốc khi trang load
    fetchMedicines();
});

// 6. XÓA THUỐC
function deleteMedicine(id) {
    Swal.fire({
        title: 'Xóa thuốc?',
        text: `Bạn có chắc chắn muốn xóa thuốc #T${id} khỏi hệ thống?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/thuoc/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire('Đã xóa!', data.message, 'success');
                    fetchMedicines();
                } else {
                    Swal.fire('Lỗi!', data.message, 'error');
                }
            } catch (error) {
                console.error('Lỗi xóa thuốc:', error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
}
