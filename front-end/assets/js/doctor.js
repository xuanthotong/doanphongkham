// Khởi tạo mảng rỗng, dữ liệu sẽ do bạn tự thêm trên web
let doctors = [];

const tbody = document.getElementById('doctorTableBody');
const modal = document.getElementById('doctorModal');
const form = document.getElementById('doctorForm');
const modalTitle = document.getElementById('modalTitle');

// Format hiển thị số tiền VND
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderTable() {
    tbody.innerHTML = '';
    
    // Nếu mảng trống, có thể hiển thị một thông báo nhỏ (Tùy chọn)
    if (doctors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu bác sĩ nào. Vui lòng thêm mới.</td></tr>`;
        return;
    }

    doctors.forEach((doc) => {
        const genderText = doc.gioi_tinh == 1 ? "Nam" : "Nữ";
        const statusBadge = doc.trang_thai == 1 ? 
            `<span class="badge" style="background-color: #dcfce7; color: #166534;">Hoạt động</span>` : 
            `<span class="badge" style="background-color: #fee2e2; color: #991b1b;">Đã khóa</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${doc.anh_dai_dien || 'https://ui-avatars.com/api/?name=BS&background=random'}" class="doctor-avatar" width="40" style="border-radius:50%"></td>
            <td class="doctor-name">${doc.ho_ten}</td>
            <td>${genderText}</td>
            <td>${doc.so_dien_thoai}</td>
            <td>${doc.chuyen_khoa}</td>
            <td>${doc.nam_kinh_nghiem} năm</td>
            <td style="color: #ef4444; font-weight: 600;">${formatCurrency(doc.phi_kham)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="editDoctor(${doc.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteDoctor(${doc.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddModal() {
    form.reset();
    document.getElementById('d_id').value = '';
    modalTitle.innerText = 'Thêm mới Bác sĩ';
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

function editDoctor(id) {
    const doc = doctors.find(d => d.id === id);
    if (!doc) return;

    document.getElementById('d_id').value = doc.id;
    document.getElementById('d_ten_dang_nhap').value = doc.ten_dang_nhap;
    document.getElementById('d_mat_khau').value = doc.mat_khau;
    document.getElementById('d_email').value = doc.email;
    
    document.getElementById('d_ho_ten').value = doc.ho_ten;
    document.getElementById('d_ngay_sinh').value = doc.ngay_sinh;
    document.getElementById('d_gioi_tinh').value = doc.gioi_tinh;
    document.getElementById('d_so_dien_thoai').value = doc.so_dien_thoai;
    document.getElementById('d_dia_chi').value = doc.dia_chi;
    
    document.getElementById('d_chuyen_khoa').value = doc.chuyen_khoa;
    document.getElementById('d_nam_kinh_nghiem').value = doc.nam_kinh_nghiem;
    document.getElementById('d_phi_kham').value = doc.phi_kham;
    document.getElementById('d_anh_dai_dien').value = doc.anh_dai_dien;
    document.getElementById('d_tieu_su').value = doc.tieu_su;

    modalTitle.innerText = 'Sửa thông tin Bác sĩ';
    modal.style.display = 'flex';
}

function deleteDoctor(id) {
    if (confirm("Bạn có chắc chắn muốn xóa Bác sĩ này không?")) {
        doctors = doctors.filter(d => d.id !== id);
        renderTable();
    }
}

form.addEventListener('submit', function(e) {
    e.preventDefault();

    const idValue = document.getElementById('d_id').value;
    const newDoc = {
        ten_dang_nhap: document.getElementById('d_ten_dang_nhap').value,
        mat_khau: document.getElementById('d_mat_khau').value,
        email: document.getElementById('d_email').value,
        trang_thai: 1, // Mặc định hoạt động
        
        ho_ten: document.getElementById('d_ho_ten').value,
        ngay_sinh: document.getElementById('d_ngay_sinh').value,
        gioi_tinh: parseInt(document.getElementById('d_gioi_tinh').value), // 1 là Nam, 0 là Nữ
        so_dien_thoai: document.getElementById('d_so_dien_thoai').value,
        dia_chi: document.getElementById('d_dia_chi').value,
        anh_dai_dien: document.getElementById('d_anh_dai_dien').value,
        
        chuyen_khoa: document.getElementById('d_chuyen_khoa').value,
        nam_kinh_nghiem: parseInt(document.getElementById('d_nam_kinh_nghiem').value),
        phi_kham: parseFloat(document.getElementById('d_phi_kham').value),
        tieu_su: document.getElementById('d_tieu_su').value
    };

    if (idValue) {
        const index = doctors.findIndex(d => d.id == idValue);
        if (index !== -1) {
            doctors[index] = { ...doctors[index], ...newDoc };
        }
    } else {
        newDoc.id = Date.now(); // Tạo ID tạm thời
        doctors.push(newDoc);
    }

    renderTable();
    closeModal();
});

// Chạy lần đầu
renderTable();