let specialtiesList = [];
const specialtyTbody = document.getElementById('specialtyTableBody');
const specialtyModal = document.getElementById('specialtyModal');
const specialtyForm = document.getElementById('specialtyForm');
const specialtyModalTitle = document.getElementById('specialtyModalTitle');

async function fetchAdminSpecialties() {
    if (!specialtyTbody) return;
    try {
        const res = await fetch('http://localhost:3000/api/specialties');
        specialtiesList = await res.json();
        renderSpecialtyTable();
    } catch (error) {
        console.error('Lỗi lấy danh sách chuyên khoa:', error);
    }
}

function renderSpecialtyTable() {
    if (!specialtyTbody) return;
    specialtyTbody.innerHTML = '';

    if (specialtiesList.length === 0) {
        specialtyTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu chuyên khoa.</td></tr>`;
        return;
    }

    specialtiesList.forEach(spec => {
        const moTaText = (spec.mo_ta && spec.mo_ta.trim() !== "") ? spec.mo_ta : '<span style="color:#9ca3af;">Chưa có mô tả</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${spec.id}</td>
            <td style="font-weight: 600; color: var(--primary-color);">${spec.ten_chuyen_khoa}</td>
            <td style="max-width: 400px; white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${moTaText}</td>
            <td>
                <button class="action-btn edit" onclick="editSpecialty(${spec.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteSpecialty(${spec.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        specialtyTbody.appendChild(tr);
    });
}

function openSpecialtyModal() {
    specialtyForm.reset();
    document.getElementById('s_id').value = '';
    specialtyModalTitle.innerText = 'Thêm mới Chuyên khoa';
    specialtyModal.style.display = 'flex';
}

function closeSpecialtyModal() {
    specialtyModal.style.display = 'none';
}

function editSpecialty(id) {
    const spec = specialtiesList.find(s => s.id === id);
    if (!spec) return;
    
    document.getElementById('s_id').value = spec.id;
    document.getElementById('s_ten_chuyen_khoa').value = spec.ten_chuyen_khoa;
    document.getElementById('s_mo_ta').value = spec.mo_ta || '';
    
    specialtyModalTitle.innerText = 'Sửa thông tin Chuyên khoa';
    specialtyModal.style.display = 'flex';
}

async function deleteSpecialty(id) {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: "Các Bác sĩ thuộc chuyên khoa này có thể bị ảnh hưởng!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('http://localhost:3000/api/specialties/' + id, { method: 'DELETE' });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Xóa chuyên khoa thành công!', 'success');
                    fetchAdminSpecialties();
                } else {
                    Swal.fire('Lỗi!', data.message || 'Lỗi khi xóa!', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi kết nối!', 'Không thể kết nối đến server!', 'error');
            }
        }
    });
}

specialtyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('s_id').value;
    const payload = {
        ten_chuyen_khoa: document.getElementById('s_ten_chuyen_khoa').value,
        mo_ta: document.getElementById('s_mo_ta').value
    };

    try {
        const url = id ? `http://localhost:3000/api/specialties/${id}` : 'http://localhost:3000/api/specialties';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) { 
            Swal.fire('Thành công!', id ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success'); 
            closeSpecialtyModal(); 
            fetchAdminSpecialties(); 
        }
        else { Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra!', 'error'); }
    } catch (error) { console.error(error); Swal.fire('Lỗi kết nối!', 'Không thể kết nối server!', 'error'); }
});

document.addEventListener('DOMContentLoaded', fetchAdminSpecialties);