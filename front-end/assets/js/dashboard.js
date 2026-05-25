window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
// Chuyển Tab Menu
function switchTab(tabName, clickedElement) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    clickedElement.classList.add('active');
    
    const allSections = document.querySelectorAll('.content');
    allSections.forEach(section => section.style.display = 'none');

    document.getElementById('section-' + tabName).style.display = 'block';
    
    // Đóng sidebar trên mobile sau khi chọn chức năng
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
}

// Đóng mở Menu Nhóm
function toggleMenu(element, submenuId) {
    element.classList.toggle('active');
    const submenu = document.getElementById(submenuId);
    if (submenu.classList.contains('open')) {
        submenu.classList.remove('open');
    } else {
        submenu.classList.add('open');
    }
}

// Đóng Modal dùng chung
function closeModal(modalId = 'doctorModal') { 
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => m.style.display = 'none');
}

// Tắt Modal khi bấm ra ngoài vùng tối
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// Đăng xuất
function confirmLogout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: "Bạn có chắc chắn muốn thoát khỏi phiên làm việc?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0284C7',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminInfo');
            window.location.href = '../index.html'; 
        }
    });
}

// Format Tiền tệ dùng chung
function formatCurrency(amount) {
    return Number(amount).toLocaleString('vi-VN') + ' VNĐ';
}

// =========================================================================================
// QUẢN LÝ CA LÀM VIỆC (ADMIN)
// =========================================================================================
const shiftTbody = document.getElementById('shiftAdminTableBody');
let allAdminShifts = [];
let currentAdminShiftPage = 1;
const adminShiftItemsPerPage = 20;

async function fetchAdminShifts() {
    if (!shiftTbody) return;
    try {
        const response = await fetch(`${window.API_BASE}/api/doctors/shifts/admin/all`);
        allAdminShifts = await response.json();
        renderAdminShiftTable();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ca làm việc:', error);
    }
}

function renderAdminShiftTable() {
    if (!shiftTbody) return;
    shiftTbody.innerHTML = '';

    const searchInput = document.getElementById('searchAdminShift');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const dateInput = document.getElementById('filterAdminShiftDate');
    const filterDate = dateInput ? dateInput.value : '';
    
    const statusInput = document.getElementById('filterAdminShiftStatus');
    const filterStatus = statusInput ? statusInput.value : '';

    if (window.lastAdminShiftKeyword !== keyword || window.lastAdminShiftDate !== filterDate || window.lastAdminShiftStatus !== filterStatus) {
        currentAdminShiftPage = 1;
        window.lastAdminShiftKeyword = keyword;
        window.lastAdminShiftDate = filterDate;
        window.lastAdminShiftStatus = filterStatus;
    }

    let filteredShifts = allAdminShifts;

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);

    if (filterDate) {
        filteredShifts = filteredShifts.filter(shift => {
            if (!shift.ngay_lam_viec) return false;
            return shift.ngay_lam_viec.split('T')[0] === filterDate;
        });
    }

    if (filterStatus) {
        filteredShifts = filteredShifts.filter(shift => {
            const shiftDateStr = shift.ngay_lam_viec.split('T')[0];
            const timeParts = shift.khung_gio.split(' - ');
            const endTime = timeParts.length === 2 ? timeParts[1] : '23:59';

            let isExpired = false;
            if (shiftDateStr < localDateStr) isExpired = true;
            else if (shiftDateStr === localDateStr && currentTimeStr > endTime) isExpired = true;

            let computedStatus = '';
            if (isExpired) computedStatus = 'expired';
            else if (shift.trang_thai === 'Stopped') computedStatus = 'stopped';
            else if (shift.so_luong_hien_tai >= shift.so_luong_toi_da) computedStatus = 'full';
            else computedStatus = 'active';

            return computedStatus === filterStatus;
        });
    }

    if (keyword) {
        filteredShifts = filteredShifts.filter(shift => 
            (shift.ten_bac_si && shift.ten_bac_si.toLowerCase().includes(keyword)) ||
            `clv${shift.id}`.includes(keyword)
        );
    }

    if (filteredShifts.length === 0) {
        shiftTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy ca làm việc phù hợp.</td></tr>`;
        let paginationContainer = document.getElementById('admin_shift_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredShifts.length / adminShiftItemsPerPage);
    if (currentAdminShiftPage > totalPages) currentAdminShiftPage = totalPages;
    if (currentAdminShiftPage < 1) currentAdminShiftPage = 1;
    const startIndex = (currentAdminShiftPage - 1) * adminShiftItemsPerPage;
    const endIndex = startIndex + adminShiftItemsPerPage;
    const paginatedShifts = filteredShifts.slice(startIndex, endIndex);
    
    // Đã tính toán `now`, `offset`, `localDateStr`, `currentTimeStr` ở phía trên

    paginatedShifts.forEach(shift => {
        const shiftDateStr = shift.ngay_lam_viec.split('T')[0];
        const d = new Date(shiftDateStr);
        const ngayLamStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        
        // Lấy giờ kết thúc của ca làm việc
        const timeParts = shift.khung_gio.split(' - ');
        const endTime = timeParts.length === 2 ? timeParts[1] : '23:59';

        // Kiểm tra xem ca làm việc đã đi qua thời điểm hiện tại chưa
        let isExpired = false;
        if (shiftDateStr < localDateStr) isExpired = true;
        else if (shiftDateStr === localDateStr && currentTimeStr > endTime) isExpired = true;

        let statusHtml = '';
        if (isExpired) {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;"><i class="fa-solid fa-lock"></i> Đã đóng</span>`;
        } else if (shift.trang_thai === 'Stopped') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;">Đã dừng</span>`;
        } else if (shift.so_luong_hien_tai >= shift.so_luong_toi_da) {
            statusHtml = `<span class="badge" style="background:#fef3c7; color:#d97706;">Đã kín</span>`;
        } else {
            statusHtml = `<span class="badge" style="background:#dcfce7; color:#166534;">Đang mở</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#CLV${shift.id}</strong></td>
            <td style="color: var(--primary-color); font-weight: 600;">BS. ${shift.ten_bac_si}</td>
            <td>${shift.ten_chuyen_khoa || 'Đa khoa'}</td>
            <td>${ngayLamStr}</td>
            <td style="font-weight: 600;">${shift.khung_gio}</td>
            <td><span style="color:#0284c7; font-weight:bold;">${shift.so_luong_hien_tai}</span> / ${shift.so_luong_toi_da}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteAdminShift(${shift.id})" title="Xóa ca làm việc này"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        shiftTbody.appendChild(tr);
    });
    
    renderAdminShiftPagination(totalPages);
}

function renderAdminShiftPagination(totalPages) {
    let paginationContainer = document.getElementById('admin_shift_pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin_shift_pagination';
        paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; width: 100%;';
        
        const table = shiftTbody.closest('table');
        if (table && table.parentNode) {
            table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        }
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentAdminShiftPage > 1) {
        html += `<button onclick="changeAdminShiftPage(${currentAdminShiftPage - 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&laquo;</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentAdminShiftPage) {
            html += `<button style="padding: 6px 12px; border: 1px solid #0284c7; background: #0284c7; color: white; border-radius: 6px; font-weight: bold; cursor: default;">${i}</button>`;
        } else {
            html += `<button onclick="changeAdminShiftPage(${i})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">${i}</button>`;
        }
    }

    if (currentAdminShiftPage < totalPages) {
        html += `<button onclick="changeAdminShiftPage(${currentAdminShiftPage + 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&raquo;</button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeAdminShiftPage(page) {
    currentAdminShiftPage = page;
    renderAdminShiftTable();
}

function deleteAdminShift(id) {
    Swal.fire({
        title: 'Cảnh báo hệ thống',
        text: `Bạn đang thực hiện xóa Ca làm việc #CLV${id} dưới quyền Admin. Dữ liệu rác (nếu có) sẽ bị dọn sạch. Bạn có chắc chắn không?`,
        icon: 'warning',
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#9ca3af', 
        confirmButtonText: 'Đồng ý xóa', 
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${window.API_BASE}/api/doctors/shifts/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) { 
                    Swal.fire('Đã xóa!', data.message, 'success'); 
                    fetchAdminShifts(); 
                } else { 
                    Swal.fire('Hệ thống từ chối!', data.message, 'error'); 
                }
            } catch (error) { 
                console.error('Lỗi API Xóa:', error);
                Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
            }
        }
    });
}

// =========================================================================================
// KHỞI TẠO MENU MOBILE VÀ CHART.JS
// =========================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. GỌI API CA LÀM VIỆC
    fetchAdminShifts();

    // 2. LOGIC MENU MOBILE
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    
    let mobileMenuBtn = document.querySelector('.topbar .mobile-menu-btn');
    if (!mobileMenuBtn && topbar) {
        mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        
        let leftContainer = document.createElement('div');
        leftContainer.style.display = 'flex';
        leftContainer.style.alignItems = 'center';
        leftContainer.style.gap = '15px';
        
        leftContainer.appendChild(mobileMenuBtn);
        
        if (topbar.firstElementChild && !topbar.firstElementChild.classList.contains('user-profile')) {
            leftContainer.appendChild(topbar.firstElementChild);
        }
        topbar.insertBefore(leftContainer, topbar.firstChild);
    }
    
    let closeMenuBtn = document.querySelector('.close-menu-btn');
    if (!closeMenuBtn && sidebar) {
        closeMenuBtn = document.createElement('button');
        closeMenuBtn.className = 'close-menu-btn';
        closeMenuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        sidebar.insertBefore(closeMenuBtn, sidebar.firstChild);
    }

    if (mobileMenuBtn && sidebar) {
        const newBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newBtn, mobileMenuBtn);
        mobileMenuBtn = newBtn;

        mobileMenuBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }
    if (closeMenuBtn && sidebar) {
        closeMenuBtn.addEventListener('click', () => sidebar.classList.remove('active'));
    }

    // 1. VẼ BIỂU ĐỒ TRÒN VÀ STAT CARDS TỪ API
    const ctxPie = document.getElementById('userPieChart');
    let pieChartInstance = null;

    async function fetchDashboardStats() {
        try {
            const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api' 
                : `${window.API_BASE}/api`;

            const response = await fetch(`${API_URL}/dashboard/stats`);
            if (response.ok) {
                const stats = await response.json();
                
                const elDoctors = document.getElementById('total-doctors');
                if (elDoctors) elDoctors.innerText = stats.bac_si;
                
                const elPatients = document.getElementById('total-patients');
                if (elPatients) elPatients.innerText = stats.benh_nhan;
                
                const elAdmins = document.getElementById('total-admins');
                if (elAdmins) elAdmins.innerText = stats.admin;

                if (ctxPie) {
                    pieChartInstance = new Chart(ctxPie, {
                        type: 'doughnut',
                        data: {
                            labels: ['Bệnh nhân', 'Bác sĩ', 'Quản trị viên'],
                            datasets: [{
                                data: [stats.benh_nhan || 0, stats.bac_si || 0, stats.admin || 0],
                                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                                hoverOffset: 12,
                                borderWidth: 0
                            }]
                        },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            cutout: '70%', 
                            plugins: { 
                                legend: { position: 'bottom' },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            let value = context.parsed;
                                            let total = context.chart._metasets[context.datasetIndex].total;
                                            let percentage = Math.round((value / total) * 100) + '%';
                                            return `${context.label}: ${Number(value).toLocaleString('vi-VN')} người (${percentage})`;
                                        }
                                    }
                                }
                            } 
                        }
                    });
                }
            } else {
                // Nếu API trả về lỗi (404, 500...)
                const errorText = await response.text();
                console.error("❌ Lỗi API Thống kê Tổng quan:", errorText);
                
                const elDoctors = document.getElementById('total-doctors');
                if (elDoctors) elDoctors.innerText = '0';
                const elPatients = document.getElementById('total-patients');
                if (elPatients) elPatients.innerText = '0';
                const elAdmins = document.getElementById('total-admins');
                if (elAdmins) elAdmins.innerText = '0';
            }
        } catch (error) {
            console.error('Lỗi khi lấy thống kê tổng quan:', error);
        }
    }
    fetchDashboardStats();

    // 2. VẼ BIỂU ĐỒ CỘT DOANH THU TỪ API
    const ctxBar = document.getElementById('revenueBarChart');
    let revenueChartInstance = null;
    let currentChartDate = new Date(); // Lấy ngày giờ thực tế của hệ thống làm mốc
    let currentChartMode = 'week';

    if (ctxBar) {
        revenueChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tổng doanh thu (VNĐ)',
                    data: [],
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 14,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                let value = context.raw || 0;
                                return context.dataset.label + ': ' + Number(value).toLocaleString('vi-VN') + ' VNĐ';
                            }
                        }
                    }
                }
            }
        });

        // Hàm Cập nhật lại Biểu đồ dựa theo Thời gian thực gọi API
        async function updateRevenueChart() {
            const timeLabel = document.getElementById('timeLabel');
            // Format YYYY-MM-DD local
            const offset = currentChartDate.getTimezoneOffset() * 60000;
            const dateParam = new Date(currentChartDate.getTime() - offset).toISOString().split('T')[0];

            if (currentChartMode === 'week') {
                let d = new Date(currentChartDate);
                let day = d.getDay();
                let diff = d.getDate() - day + (day === 0 ? -6 : 1);
                let monday = new Date(d.setDate(diff));
                let sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                if(timeLabel) timeLabel.innerText = `Tuần: ${String(monday.getDate()).padStart(2,'0')}/${String(monday.getMonth()+1).padStart(2,'0')} - ${String(sunday.getDate()).padStart(2,'0')}/${String(sunday.getMonth()+1).padStart(2,'0')}/${sunday.getFullYear()}`;
            } else {
                let year = currentChartDate.getFullYear();
                if(timeLabel) timeLabel.innerText = `Năm ${year}`;
            }

            try {
                const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                    ? 'http://localhost:3000/api' 
                    : `${window.API_BASE}/api`;

                const response = await fetch(`${API_URL}/dashboard/revenue?mode=${currentChartMode}&date=${dateParam}`);
                if (response.ok) {
                    const resData = await response.json();
                    revenueChartInstance.data.labels = resData.labels;
                    revenueChartInstance.data.datasets[0].data = resData.data;
                    revenueChartInstance.update();
                } else {
                    const errorText = await response.text();
                    console.error("❌ Lỗi API Doanh thu:", errorText);
                    if(timeLabel) timeLabel.innerText = "Lỗi tải dữ liệu";
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu doanh thu:", error);
            }
        }

        updateRevenueChart(); // Chạy hàm khởi tạo lần đầu

        // Sự kiện lọc dữ liệu (Dropdown Filter)
        const revenueFilter = document.getElementById('revenueFilter');
        if (revenueFilter) {
            revenueFilter.addEventListener('change', function(e) {
                currentChartMode = e.target.value;
                updateRevenueChart();
            });
        }

        // Sự kiện Bấm nút Lùi / Tiến
        const prevBtn = document.getElementById('prevTimeBtn');
        const nextBtn = document.getElementById('nextTimeBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentChartMode === 'week') currentChartDate.setDate(currentChartDate.getDate() - 7);
                else currentChartDate.setFullYear(currentChartDate.getFullYear() - 1);
                updateRevenueChart();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentChartMode === 'week') currentChartDate.setDate(currentChartDate.getDate() + 7);
                else currentChartDate.setFullYear(currentChartDate.getFullYear() + 1);
                updateRevenueChart();
            });
        }
    }
});
