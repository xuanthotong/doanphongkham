// Gán hàm này vào sự kiện submit form Đăng nhập của bạn
async function handleLogin(event) {
    event.preventDefault();

    // Đổi lại ID cho đúng với các thẻ input trong HTML của bạn
    const ten_dang_nhap = document.getElementById('login_username').value; 
    const mat_khau = document.getElementById('login_password').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
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

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai })
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
                const res = await fetch('http://localhost:3000/api/password/reset', {
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

// ==================================================
// HÀM KIỂM TRA: CHẶN ĐẶT LỊCH KHI CHƯA ĐĂNG NHẬP
// ==================================================
function requireLoginToBook(e) {
    if(e) e.preventDefault();
    Swal.fire({
        title: 'Yêu cầu tài khoản',
        text: 'Bạn cần đăng nhập hoặc tạo tài khoản mới để có thể đặt lịch khám bệnh!',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#10B981', // Nút Đăng ký màu Xanh lá
        cancelButtonColor: '#0284C7',  // Nút Đăng nhập màu Xanh dương
        confirmButtonText: '<i class="fa-solid fa-user-plus"></i> Đăng ký ngay',
        cancelButtonText: '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập'
    }).then((result) => {
        if (result.isConfirmed) {
            // Người dùng bấm "Đăng ký ngay" -> Mở form Đăng ký
            openModal('registerModal');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Người dùng bấm "Đăng nhập" -> Mở form Đăng nhập
            openModal('loginModal');
        }
    });
}