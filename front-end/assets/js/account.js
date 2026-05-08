const accountTbody = document.getElementById('accountTableBody');
let allAccounts = []; // Lưu lại danh sách tài khoản dùng cho chức năng Sửa
let currentAccountPage = 1;
const accountItemsPerPage = 20;

async function fetchAccounts() {
    // Nếu trang hiện tại không có bảng Tài khoản thì bỏ qua, tránh báo lỗi
    if (!accountTbody) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/accounts');
        allAccounts = await response.json();
        renderAccountTable();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu tài khoản:', error);
    }
}

function renderAccountTable() {
    if (!accountTbody) return;
    accountTbody.innerHTML = '';
    
    if (allAccounts.length === 0) {
        accountTbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu tài khoản.</td></tr>`;
        let paginationContainer = document.getElementById('admin_account_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(allAccounts.length / accountItemsPerPage);
    if (currentAccountPage > totalPages) currentAccountPage = totalPages;
    if (currentAccountPage < 1) currentAccountPage = 1;

    const startIndex = (currentAccountPage - 1) * accountItemsPerPage;
    const endIndex = startIndex + accountItemsPerPage;
    const paginatedAccounts = allAccounts.slice(startIndex, endIndex);

    paginatedAccounts.forEach((acc) => {
        const genderText = acc.gioi_tinh == 1 ? "Nam" : (acc.gioi_tinh == 0 ? "Nữ" : "Chưa cập nhật");
        const statusBadge = acc.trang_thai == 1 ? 
            `<span class="badge" style="background-color: #dcfce7; color: #166534;">Hoạt động</span>` : 
            `<span class="badge" style="background-color: #fee2e2; color: #991b1b;">Đã khóa</span>`;

        // Render ảnh mặc định nếu chưa có
        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.ho_ten || acc.ten_dang_nhap)}&background=random`;
        const imgSrc = acc.anh_dai_dien && acc.anh_dai_dien.trim() !== "" ? acc.anh_dai_dien : defaultImg;
        
        // Màu nhãn dán tùy theo vai trò
        const roleBadgeColor = acc.ten_vai_tro === 'Admin' ? 'background: #fef08a; color: #92400e;' : (acc.ten_vai_tro === 'BacSi' ? 'background: #bae6fd; color: #075985;' : 'background: #e0e7ff; color: #4338ca;');

        // TẠO NÚT BẤM (CHẶN ADMIN)
        let actionButtons = '';
        if (acc.ten_vai_tro === 'Admin') {
            // Nút mờ, không click được đối với Admin
            actionButtons = `
                <button class="action-btn edit" style="opacity: 0.3; cursor: not-allowed;" title="Không thể sửa Admin"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" style="opacity: 0.3; cursor: not-allowed;" title="Không thể xóa Admin"><i class="fa-solid fa-trash"></i></button>
            `;
        } else {
            // Nút bình thường đối với Bệnh nhân / Bác sĩ
            actionButtons = `
                <button class="action-btn edit" onclick="editAccount(${acc.id})" title="Sửa tài khoản"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteAccount(${acc.id})" title="Xóa tài khoản"><i class="fa-solid fa-trash"></i></button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${imgSrc}" onerror="this.onerror=null; this.src='${defaultImg}';" width="40" height="40" style="border-radius:50%; object-fit: cover; border: 1px solid #ddd;"></td>
            <td>${acc.id}</td>
            <td style="font-weight: 600;">${acc.ten_dang_nhap}</td>
            <td>********</td>
            <td>${acc.ho_ten || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${acc.ngay_sinh ? new Date(acc.ngay_sinh).toLocaleDateString('vi-VN') : '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${genderText}</td>
            <td>${acc.so_dien_thoai || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${acc.email}</td>
            <td>${acc.dia_chi || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td><span class="badge" style="${roleBadgeColor}">${acc.ten_vai_tro}</span></td>
            <td>${statusBadge}</td>
            <td>
                ${actionButtons}
            </td>
        `;
        accountTbody.appendChild(tr);
    });
    
    renderAccountPagination(totalPages);
}

function renderAccountPagination(totalPages) {
    let paginationContainer = document.getElementById('admin_account_pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin_account_pagination';
        paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; width: 100%;';
        
        const table = accountTbody.closest('table');
        if (table && table.parentNode) {
            table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        }
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentAccountPage > 1) {
        html += `<button onclick="changeAccountPage(${currentAccountPage - 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&laquo;</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentAccountPage) {
            html += `<button style="padding: 6px 12px; border: 1px solid #0284c7; background: #0284c7; color: white; border-radius: 6px; font-weight: bold; cursor: default;">${i}</button>`;
        } else {
            html += `<button onclick="changeAccountPage(${i})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">${i}</button>`;
        }
    }

    if (currentAccountPage < totalPages) {
        html += `<button onclick="changeAccountPage(${currentAccountPage + 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&raquo;</button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeAccountPage(page) {
    currentAccountPage = page;
    renderAccountTable();
}

// ==========================================
// HÀM XÓA TÀI KHOẢN (CALL API DELETE)
// ==========================================
async function deleteAccount(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: `Bạn có chắc chắn muốn xóa tài khoản có ID = ${id} không? Hành động này không thể hoàn tác!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/accounts/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Đã xóa!', 'Xóa tài khoản thành công!', 'success');
                    fetchAccounts();
                } else {
                    Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra khi xóa tài khoản!', 'error');
                }
            } catch (error) {
                console.error('Lỗi API Xóa:', error);
                Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server để xóa!', 'error');
            }
        }
    });
}

// ==========================================
// HÀM SỬA TÀI KHOẢN
// ==========================================
function editAccount(id) {
    const acc = allAccounts.find(a => a.id === id);
    if (!acc) return;

    // Đổ dữ liệu cũ vào Form
    document.getElementById('a_id').value = acc.id;
    document.getElementById('a_email').value = acc.email || '';
    document.getElementById('a_mat_khau').value = ''; // Để trống mật khẩu cũ
    document.getElementById('a_ten_vai_tro').value = acc.ten_vai_tro;
    document.getElementById('a_trang_thai').value = acc.trang_thai == 1 ? '1' : '0';
    
    document.getElementById('a_ho_ten').value = acc.ho_ten || '';
    document.getElementById('a_so_dien_thoai').value = acc.so_dien_thoai || '';
    
    // Xử lý cắt chuỗi ngày sinh
    if (acc.ngay_sinh) {
        document.getElementById('a_ngay_sinh').value = acc.ngay_sinh.split('T')[0];
    } else {
        document.getElementById('a_ngay_sinh').value = '';
    }
    
    document.getElementById('a_gioi_tinh').value = acc.gioi_tinh == 1 ? '1' : (acc.gioi_tinh == 0 ? '0' : '');
    document.getElementById('a_dia_chi').value = acc.dia_chi || '';

    document.getElementById('accountModal').style.display = 'flex';
}

function closeAccountModal() {
    document.getElementById('accountModal').style.display = 'none';
}

// XỬ LÝ LƯU DỮ LIỆU KHI SUBMIT
const accountForm = document.getElementById('accountForm');
if (accountForm) {
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('a_id').value;
        const payload = {
            email: document.getElementById('a_email').value,
            mat_khau: document.getElementById('a_mat_khau').value,
            ten_vai_tro: document.getElementById('a_ten_vai_tro').value,
            trang_thai: parseInt(document.getElementById('a_trang_thai').value),
            ho_ten: document.getElementById('a_ho_ten').value,
            so_dien_thoai: document.getElementById('a_so_dien_thoai').value,
            ngay_sinh: document.getElementById('a_ngay_sinh').value,
            gioi_tinh: document.getElementById('a_gioi_tinh').value,
            dia_chi: document.getElementById('a_dia_chi').value
        };

        try {
            const res = await fetch(`http://localhost:3000/api/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            
            if (res.ok) { Swal.fire('Thành công!', 'Cập nhật tài khoản thành công', 'success'); closeAccountModal(); fetchAccounts(); } 
            else { Swal.fire('Lỗi!', data.message || 'Không thể cập nhật', 'error'); }
        } catch (error) { console.error(error); Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ', 'error'); }
    });
}

// Gọi API ngay khi tải trang
fetchAccounts();