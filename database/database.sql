
CREATE TABLE Roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL 
);
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL FOREIGN KEY REFERENCES Roles(id),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE User_Profiles (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(id),
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    gender TINYINT,
    date_of_birth DATE,
    avatar_url VARCHAR(255),
    address NVARCHAR(255)
);
CREATE TABLE Specialties (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    image_url VARCHAR(255)
);

CREATE TABLE Doctor_Details (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(id),
    specialty_id INT FOREIGN KEY REFERENCES Specialties(id),
    experience_years INT,
    bio NVARCHAR(MAX),
    consultation_fee DECIMAL(18, 2)
);
CREATE TABLE Patient_Details (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(id),
    blood_type VARCHAR(10),
    medical_history NVARCHAR(MAX)
);

CREATE TABLE Doctor_Schedules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    doctor_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL, 
    max_bookings INT NOT NULL DEFAULT 0,
    current_bookings INT NOT NULL DEFAULT 0
);

CREATE TABLE Appointments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    schedule_id INT NOT NULL FOREIGN KEY REFERENCES Doctor_Schedules(id),
    symptoms_description NVARCHAR(MAX),
    status VARCHAR(50) DEFAULT 'Pending',
    doctor_notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
CREATE TABLE News_Categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE News (
    id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT FOREIGN KEY REFERENCES News_Categories(id),
    author_id INT FOREIGN KEY REFERENCES Users(id),
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    thumbnail VARCHAR(255),
    published_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE QnA (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    doctor_id INT FOREIGN KEY REFERENCES Users(id), 
    specialty_id INT FOREIGN KEY REFERENCES Specialties(id),
    question_title NVARCHAR(255) NOT NULL,
    question_content NVARCHAR(MAX) NOT NULL,
    answer_content NVARCHAR(MAX),
    is_resolved BIT DEFAULT 0, 
    created_at DATETIME DEFAULT GETDATE()
);

