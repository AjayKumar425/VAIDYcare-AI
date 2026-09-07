CREATE DATABASE IF NOT EXISTS medikiosk_db;
USE medikiosk_db;

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    abha_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Intake Encounters & Tokens
CREATE TABLE IF NOT EXISTS intake_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    chief_complaint TEXT NOT NULL,
    symptoms JSON NOT NULL,
    vitals JSON NULL,
    qr_code_data LONGTEXT NOT NULL,
    status ENUM('WAITING', 'IN_CONSULTATION', 'COMPLETED') DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 3. Uploaded Medical Documents
CREATE TABLE IF NOT EXISTS medical_documents (
    doc_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    doc_type ENUM('BLOOD_REPORT', 'X_RAY', 'PRESCRIPTION', 'DISCHARGE_SUMMARY') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    raw_extracted_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES intake_sessions(session_id) ON DELETE CASCADE
);

-- 4. Extracted Lab Biomarkers
CREATE TABLE IF NOT EXISTS lab_biomarkers (
    biomarker_id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id INT NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    measured_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    ref_min DECIMAL(10,2) NOT NULL,
    ref_max DECIMAL(10,2) NOT NULL,
    status ENUM('NORMAL', 'LOW', 'HIGH', 'CRITICAL') NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES medical_documents(doc_id) ON DELETE CASCADE
);