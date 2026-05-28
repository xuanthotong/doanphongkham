window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
// Gán hàm này vào sự kiện submit form Đăng nhập của bạn
async function handleLogin(event) {
    event.preventDefault();

    // Đổi lại ID cho đúng với các thẻ input trong HTML của bạn
    const ten_dang_nhap = document.getElementById('login_username').value; 
    const mat_khau = document.getElementById('login_password').value;

    try {
        const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.protocol === 'file:') 
            ? 'http://localhost:3000/api' 
            : window.API_BASE + '/api';

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten_dang_nhap, mat_khau })
        });

        const data = await response.json();

        if (response.ok) {
            // Phân tách bộ nhớ để Bác sĩ và Bệnh nhân không bị đè dữ liệu lên nhau
            if (data.redirectUrl && data.redirectUrl.includes('doctor')) {
                localStorage.setItem('doctorToken', data.token);
                localStorage.setItem('doctorInfo', JSON.stringify(data.user));
            } else if (data.redirectUrl && data.redirectUrl.includes('admin')) {
                // Dành riêng cho Admin
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.user));
            } else {
                // Dành cho Bệnh nhân
                localStorage.setItem('token', data.token);
                localStorage.setItem('userInfo', JSON.stringify(data.user));
            }

            Swal.fire({
                title: 'Thành công!',
                text: 'Đăng nhập thành công!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = data.redirectUrl; 
            });
        } else {
            Swal.fire('Đăng nhập thất bại!', data.message || 'Vui lòng kiểm tra lại thông tin.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
    }
}

// Gán hàm này vào sự kiện submit form Đăng ký của bạn
async function handleRegister(event) {
    event.preventDefault();

    // Đổi lại ID cho đúng với các thẻ input trong HTML của bạn
    const ten_dang_nhap = document.getElementById('reg_username').value;
    const mat_khau = document.getElementById('reg_password').value;
    const email = document.getElementById('reg_email').value;
    const ho_ten = document.getElementById('reg_fullname').value;
    const so_dien_thoai = document.getElementById('reg_phone').value;
    const ngay_sinh = document.getElementById('reg_birthday') ? document.getElementById('reg_birthday').value : null;
    const gioi_tinh = document.getElementById('reg_gender') ? document.getElementById('reg_gender').value : null;
    const dia_chi = document.getElementById('reg_province') ? document.getElementById('reg_province').value : null;

    // Bật log để xem dữ liệu có lấy được từ Form không
    console.log("📤 Frontend chuẩn bị gửi đăng ký:", { ten_dang_nhap, ngay_sinh, gioi_tinh, dia_chi });

    try {
        const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.protocol === 'file:') 
            ? 'http://localhost:3000/api' 
            : window.API_BASE + '/api';

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                title: 'Thành công!',
                text: 'Đăng ký tài khoản thành công! Vui lòng tiến hành đăng nhập.',
                icon: 'success',
                confirmButtonColor: '#0284C7'
            }).then(() => {
                if (typeof switchModal === 'function') {
                    switchModal('registerModal', 'loginModal');
                } else {
                    window.location.href = 'login.html';
                }
            });
        } else {
            Swal.fire('Lỗi đăng ký!', data.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
    }
}

// Hàm Ẩn / Hiện mật khẩu dùng chung
function togglePassword(icon, inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash"); // Đổi sang icon mắt nhắm
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye"); // Đổi lại thành icon mắt mở
    }
}

// HÀM QUÊN MẬT KHẨU
function handleForgotPassword(event) {
    if (event) event.preventDefault();

    Swal.fire({
        title: 'Khôi phục mật khẩu',
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <label style="font-weight: 600; font-size: 14px; display: block; margin-bottom: 5px;">Email đã đăng ký (*)</label>
                <input type="email" id="reset_email" class="swal2-input" placeholder="Nhập email của bạn" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 0 15px 0;">
                
                <label style="font-weight: 600; font-size: 14px; display: block; margin-bottom: 5px;">Mật khẩu mới (*)</label>
                <input type="password" id="reset_pass" class="swal2-input" placeholder="Nhập mật khẩu mới" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 0 15px 0;">
                
                <label style="font-weight: 600; font-size: 14px; display: block; margin-bottom: 5px;">Xác nhận mật khẩu mới (*)</label>
                <input type="password" id="reset_pass_confirm" class="swal2-input" placeholder="Nhập lại mật khẩu mới" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Đổi mật khẩu',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#0284C7',
        preConfirm: () => {
            const email = document.getElementById('reset_email').value;
            const pass = document.getElementById('reset_pass').value;
            const passConfirm = document.getElementById('reset_pass_confirm').value;

            if (!email) { Swal.showValidationMessage('Vui lòng nhập email!'); return false; }
            if (!pass || pass.length < 8) { Swal.showValidationMessage('Mật khẩu mới phải có ít nhất 8 ký tự!'); return false; }
            if (pass !== passConfirm) { Swal.showValidationMessage('Mật khẩu xác nhận không khớp!'); return false; }

            return { email, mat_khau_moi: pass };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                    ? 'http://localhost:3000/api' 
                    : window.API_BASE + '/api';

                const res = await fetch(`${API_URL}/password/reset`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });
                const data = await res.json();
                
                if (res.ok) {
                    Swal.fire('Thành công!', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới!', 'success');
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại email.', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
}

// Bơm danh sách tỉnh thành vào select box ở form Đăng ký
document.addEventListener('DOMContentLoaded', () => {
    const provinceSelect = document.getElementById('reg_province');
    if (provinceSelect) {
        const provinces = [
            "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", 
            "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Nội", 
            "Hà Tĩnh", "Hải Phòng", "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu", 
            "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", 
            "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh", "Thái Nguyên", 
            "Thanh Hóa", "TP HCM", "Tuyên Quang", "Vĩnh Long"
        ];
        
        provinceSelect.innerHTML = '<option value="" disabled selected>Chọn Tỉnh/Thành phố</option>';
        provinces.sort().forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
    }
});

// ==================================================
// HÀM KIỂM TRA: CHẶN ĐẶT LỊCH KHI CHƯA ĐĂNG NHẬP
// ==================================================
function requireLoginToBook(e) {
    if(e) e.preventDefault();

    let isLoggedIn = false;
    try {
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
            const userInfo = JSON.parse(userInfoString);
            if (userInfo && userInfo.id) isLoggedIn = true;
        }
    } catch (err) {}

    if (isLoggedIn) {
        if (window.location.pathname.includes('patient.html')) {
            if (typeof switchTab === 'function') switchTab(null, 'tab-dat-lich');
        } else {
            window.location.href = 'patient/patient.html';
        }
        return;
    }

    Swal.fire({
        title: 'Yêu cầu tài khoản',
        text: 'Bạn cần đăng nhập hoặc tạo tài khoản mới để có thể đặt lịch khám bệnh!',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#0284C7',
        confirmButtonText: '<i class="fa-solid fa-user-plus"></i> Đăng ký ngay',
        cancelButtonText: '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập'
    }).then((result) => {
        if (result.isConfirmed) {
            openModal('registerModal');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            openModal('loginModal');
        }
    });
}

// ==================================================
// HÀM XỬ LÝ ĐĂNG NHẬP GOOGLE
// ==================================================
async function handleGoogleResponse(response) {
    try {
        const id_token = response.credential;
        const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.protocol === 'file:') 
            ? 'http://localhost:3000/api' 
            : window.API_BASE + '/api';

        const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token })
        });

        const data = await res.json();

        if (res.ok) {
            // Lưu token và thông tin user
            if (data.redirectUrl && data.redirectUrl.includes('doctor')) {
                localStorage.setItem('doctorToken', data.token);
                localStorage.setItem('doctorInfo', JSON.stringify(data.user));
            } else if (data.redirectUrl && data.redirectUrl.includes('admin')) {
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.user));
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userInfo', JSON.stringify(data.user));
            }

            // Kiểm tra hồ sơ có đầy đủ không
            const user = data.user;
            const isProfileIncomplete = !user.so_dien_thoai || !user.ngay_sinh || user.gioi_tinh === null || user.gioi_tinh === undefined;

            if (isProfileIncomplete) {
                await showCompleteProfilePopup(user, API_URL, data.redirectUrl);
            } else {
                Swal.fire({
                    title: 'Thành công!',
                    text: 'Đăng nhập Google thành công!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = data.redirectUrl;
                });
            }
        } else {
            Swal.fire('Đăng nhập thất bại!', data.message || 'Lỗi xác thực Google.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
    }
}

// ==================================================
// POPUP HOÀN THIỆN HỒ SƠ (CHỈ DÀNH CHO GOOGLE LOGIN)
// ==================================================
async function showCompleteProfilePopup(user, API_URL, redirectUrl) {
    const provinces = [
        "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", 
        "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Nội", 
        "Hà Tĩnh", "Hải Phòng", "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu", 
        "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", 
        "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh", "Thái Nguyên", 
        "Thanh Hóa", "TP HCM", "Tuyên Quang", "Vĩnh Long"
    ].sort();

    const provinceOptions = provinces.map(p => `<option value="${p}">${p}</option>`).join('');

    const result = await Swal.fire({
        title: '<i class="fas fa-user-edit" style="color: #0284c7;"></i> Hoàn thiện hồ sơ',
        html: `
            <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Xin chào <strong>${user.ho_ten}</strong>! Vui lòng bổ sung thông tin để hoàn tất đăng ký.</p>
            <div style="text-align: left;">
                <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px;">Số điện thoại <span style="color:red">*</span></label>
                <input type="text" id="gg_phone" class="swal2-input" placeholder="Nhập số điện thoại" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 0 12px 0;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px;">Giới tính <span style="color:red">*</span></label>
                        <select id="gg_gender" class="swal2-select" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; margin: 0;">
                            <option value="" disabled selected>-- Chọn --</option>
                            <option value="1">Nam</option>
                            <option value="0">Nữ</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px;">Ngày sinh <span style="color:red">*</span></label>
                        <input type="date" id="gg_birthday" class="swal2-input" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
                    </div>
                </div>
                
                <label style="font-weight: 600; font-size: 13px; display: block; margin: 12px 0 4px 0;">Tỉnh / Thành phố <span style="color:red">*</span></label>
                <select id="gg_province" class="swal2-select" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; margin: 0;">
                    <option value="" disabled selected>-- Chọn tỉnh/thành --</option>
                    ${provinceOptions}
                </select>
            </div>
        `,
        width: '480px',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
        confirmButtonText: '<i class="fas fa-check"></i> Xác nhận & Tiếp tục',
        confirmButtonColor: '#0284C7',
        preConfirm: () => {
            const phone = document.getElementById('gg_phone').value.trim();
            const gender = document.getElementById('gg_gender').value;
            const birthday = document.getElementById('gg_birthday').value;
            const province = document.getElementById('gg_province').value;

            if (!phone) { Swal.showValidationMessage('Vui lòng nhập số điện thoại!'); return false; }
            if (!/^(0[0-9]{9,10})$/.test(phone)) { Swal.showValidationMessage('Số điện thoại không hợp lệ!'); return false; }
            if (gender === '' || gender === null) { Swal.showValidationMessage('Vui lòng chọn giới tính!'); return false; }
            if (!birthday) { Swal.showValidationMessage('Vui lòng chọn ngày sinh!'); return false; }
            if (!province) { Swal.showValidationMessage('Vui lòng chọn tỉnh/thành phố!'); return false; }

            return { so_dien_thoai: phone, gioi_tinh: gender, ngay_sinh: birthday, dia_chi: province };
        }
    });

    if (result.isConfirmed) {
        try {
            const updateRes = await fetch(`${API_URL}/accounts/profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });

            if (updateRes.ok) {
                const updatedUser = { ...user, ...result.value };
                localStorage.setItem('userInfo', JSON.stringify(updatedUser));

                Swal.fire({
                    title: 'Hoàn tất!',
                    text: 'Hồ sơ đã được cập nhật. Chào mừng bạn đến TT Medical!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = redirectUrl;
                });
            } else {
                Swal.fire('Lỗi!', 'Không thể cập nhật hồ sơ. Vui lòng thử lại.', 'error');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
        }
    }
}
