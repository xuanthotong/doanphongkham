
CREATE TABLE VaiTro (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ten_vai_tro VARCHAR(50) NOT NULL 
);

CREATE TABLE TaiKhoan (
    id INT IDENTITY(1,1) PRIMARY KEY,
    vai_tro_id INT NOT NULL FOREIGN KEY REFERENCES VaiTro(id),
    ten_dang_nhap VARCHAR(100) NOT NULL UNIQUE,
    mat_khau VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    trang_thai BIT DEFAULT 1, 
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
CREATE TABLE HoSoNguoiDung (
    tai_khoan_id INT PRIMARY KEY FOREIGN KEY REFERENCES TaiKhoan(id),
    ho_ten NVARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20),
    gioi_tinh TINYINT, 
    ngay_sinh DATE,
    anh_dai_dien VARCHAR(MAX),
    dia_chi NVARCHAR(255)
);

CREATE TABLE ChuyenKhoa (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ten_chuyen_khoa NVARCHAR(100) NOT NULL,
    mo_ta NVARCHAR(MAX),
    anh_dai_dien VARCHAR(255)
);

CREATE TABLE HoSoBacSi (
    tai_khoan_id INT PRIMARY KEY FOREIGN KEY REFERENCES TaiKhoan(id),
    chuyen_khoa_id INT FOREIGN KEY REFERENCES ChuyenKhoa(id),
    nam_kinh_nghiem INT,
    tieu_su NVARCHAR(MAX),
    phi_kham DECIMAL(18, 2)
);

CREATE TABLE HoSoBenhNhan (
    tai_khoan_id INT PRIMARY KEY FOREIGN KEY REFERENCES TaiKhoan(id),
    tien_su_benh NVARCHAR(MAX)
);

CREATE TABLE LichLamViec (
    id INT IDENTITY(1,1) PRIMARY KEY,
    bac_si_id INT NOT NULL FOREIGN KEY REFERENCES TaiKhoan(id),
    ngay_lam_viec DATE NOT NULL,
    khung_gio VARCHAR(50) NOT NULL, 
    so_luong_toi_da INT NOT NULL DEFAULT 0,
    so_luong_hien_tai INT NOT NULL DEFAULT 0
);

CREATE TABLE LichKham (
    id INT IDENTITY(1,1) PRIMARY KEY,
    benh_nhan_id INT NOT NULL FOREIGN KEY REFERENCES TaiKhoan(id),
    lich_lam_viec_id INT NOT NULL FOREIGN KEY REFERENCES LichLamViec(id),
    mo_ta_trieu_chung NVARCHAR(MAX),
    trang_thai VARCHAR(50) DEFAULT 'Pending', -- Ch? x�c nh?n, ?� kh�m, ?� h?y...
    ghi_chu_cua_bac_si NVARCHAR(MAX),
    ngay_tao DATETIME DEFAULT GETDATE()
);

CREATE TABLE DanhMucTinTuc (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ten_danh_muc NVARCHAR(100) NOT NULL
);

CREATE TABLE TinTuc (
    id INT IDENTITY(1,1) PRIMARY KEY,
    danh_muc_id INT FOREIGN KEY REFERENCES DanhMucTinTuc(id),
    tac_gia_id INT FOREIGN KEY REFERENCES TaiKhoan(id),
    tieu_de NVARCHAR(255) NOT NULL,
    noi_dung NVARCHAR(MAX) NOT NULL,
    anh_thu_nho VARCHAR(MAX),
    ngay_xuat_ban DATETIME DEFAULT GETDATE()
);

CREATE TABLE HoiDap (
    id INT IDENTITY(1,1) PRIMARY KEY,
    benh_nhan_id INT NOT NULL FOREIGN KEY REFERENCES TaiKhoan(id),
    bac_si_id INT FOREIGN KEY REFERENCES TaiKhoan(id), 
    chuyen_khoa_id INT FOREIGN KEY REFERENCES ChuyenKhoa(id),
    tieu_de_cau_hoi NVARCHAR(255) NOT NULL,
    noi_dung_cau_hoi NVARCHAR(MAX) NOT NULL,
    noi_dung_tra_loi NVARCHAR(MAX),
    da_giai_quyet BIT DEFAULT 0, 
    ngay_tao DATETIME DEFAULT GETDATE()
);

