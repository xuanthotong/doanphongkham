let adminCategoriesList = [];
const categoryTbody = document.getElementById('categoryTableBody');
const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('categoryForm');
const categoryModalTitle = document.getElementById('categoryModalTitle');

async function fetchAdminCategories() {
    if (!categoryTbody) return;
    try {
        const res = await fetch('http://localhost:3000/api/categories');
        if (!res.ok) {
            console.error('Lỗi API Danh mục:', res.status);
            categoryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 20px;">Lỗi kết nối API Danh mục (Mã lỗi ${res.status}). Vui lòng kiểm tra lại server.js!</td></tr>`;
            return;
        }
        adminCategoriesList = await res.json();
        renderCategoryTable();
    } catch (error) { console.error('Lỗi lấy danh sách danh mục:', error); }
}

function renderCategoryTable() {
    if (!categoryTbody) return;
    categoryTbody.innerHTML = '';

    if (adminCategoriesList.length === 0) {
        categoryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu danh mục.</td></tr>`;
        return;
    }

    adminCategoriesList.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cat.id}</td>
            <td style="font-weight: 600; color: var(--primary-color);">${cat.ten_danh_muc}</td>
            <td>
                <button class="action-btn edit" onclick="editCategory(${cat.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteCategory(${cat.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        categoryTbody.appendChild(tr);
    });
}

function openCategoryModal() {
    categoryForm.reset();
    document.getElementById('c_id').value = '';
    categoryModalTitle.innerText = 'Thêm mới Danh mục';
    categoryModal.style.display = 'flex';
}

function closeCategoryModal() {
    categoryModal.style.display = 'none';
}

function editCategory(id) {
    const cat = adminCategoriesList.find(c => c.id === id);
    if (!cat) return;
    
    document.getElementById('c_id').value = cat.id;
    document.getElementById('c_ten_danh_muc').value = cat.ten_danh_muc;
    
    categoryModalTitle.innerText = 'Sửa thông tin Danh mục';
    categoryModal.style.display = 'flex';
}

async function deleteCategory(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa Danh mục này? Các bài viết thuộc danh mục này có thể bị ảnh hưởng!")) return;
    try {
        const res = await fetch('http://localhost:3000/api/categories/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { alert('Xóa danh mục thành công!'); fetchAdminCategories(); } 
        else { alert(data.message || 'Lỗi khi xóa!'); }
    } catch (error) { console.error(error); alert('Không thể kết nối đến server!'); }
}

categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('c_id').value;
    const payload = { ten_danh_muc: document.getElementById('c_ten_danh_muc').value };

    try {
        const url = id ? `http://localhost:3000/api/categories/${id}` : 'http://localhost:3000/api/categories';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        
        if (!res.ok) {
            if (res.status === 404) return alert('Lỗi 404: API /api/categories chưa được khai báo trong file server.js của Backend!');
            const errData = await res.json();
            return alert(errData.message || 'Có lỗi xảy ra từ Server!');
        }
        
        alert(id ? 'Cập nhật thành công!' : 'Thêm mới thành công!'); 
        closeCategoryModal(); 
        fetchAdminCategories();
    } catch (error) { console.error(error); alert('Không thể kết nối server!'); }
});

document.addEventListener('DOMContentLoaded', fetchAdminCategories);