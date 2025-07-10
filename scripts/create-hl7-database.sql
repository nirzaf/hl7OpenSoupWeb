-- Create HL7 Messages Collection Schema
-- This would be implemented in MongoDB, but shown as SQL for reference

-- Messages table structure
CREATE TABLE IF NOT EXISTS hl7_messages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(10) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    tags JSON,
    is_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSON
);

-- Validation rules table
CREATE TABLE IF NOT EXISTS validation_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    rule_type ENUM('structure', 'content', 'custom') NOT NULL,
    hl7_version VARCHAR(10) NOT NULL,
    segment_type VARCHAR(10),
    field_position INT,
    rule_expression TEXT NOT NULL,
    severity ENUM('error', 'warning', 'info') DEFAULT 'warning',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    message_type VARCHAR(50) NOT NULL,
    hl7_version VARCHAR(10) NOT NULL,
    template_content TEXT NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    default_hl7_version VARCHAR(10) DEFAULT '2.5',
    color_scheme VARCHAR(50) DEFAULT 'default',
    auto_validate BOOLEAN DEFAULT TRUE,
    export_format VARCHAR(20) DEFAULT 'json',
    preferences JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample validation rules
INSERT INTO validation_rules (id, name, description, rule_type, hl7_version, segment_type, field_position, rule_expression, severity) VALUES
('rule_001', 'MSH Required Fields', 'Validate required fields in MSH segment', 'structure', '2.5', 'MSH', 9, 'field_not_empty', 'error'),
('rule_002', 'PID Patient ID Required', 'Patient identifier must be present', 'structure', '2.5', 'PID', 3, 'field_not_empty', 'error'),
('rule_003', 'Date Format Validation', 'Validate HL7 date format', 'content', '2.5', NULL, NULL, 'regex:^\\d{8}(\\d{6})?$', 'warning');

-- Insert sample message templates
INSERT INTO message_templates (id, name, description, message_type, hl7_version, template_content, category) VALUES
('template_001', 'Basic ADT A01', 'Patient admission template', 'ADT^A01', '2.5', 
'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|{TIMESTAMP}||ADT^A01|{MSG_ID}|P|2.5
EVN||{TIMESTAMP}
PID|1||{PATIENT_ID}^5^M11^{FACILITY}^MR^{FACILITY}||{LAST_NAME}^{FIRST_NAME}^{MIDDLE_NAME}|{DOB}|{GENDER}||{RACE}|{ADDRESS}||(555)555-0123|(555)555-0124||{MARITAL_STATUS}||{SSN}^2^M10^{FACILITY}^SS^A|{PATIENT_ACCOUNT}|
PV1|1|{PATIENT_CLASS}|{LOCATION}||{ADMISSION_TYPE}|||{ATTENDING_DOCTOR}|{REFERRING_DOCTOR}|||{HOSPITAL_SERVICE}|||{ATTENDING_DOCTOR}|{PATIENT_TYPE}|{FINANCIAL_CLASS}|||||||||||||||||||||{ADMIT_DATETIME}', 'admission'),

('template_002', 'Lab Results ORU R01', 'Laboratory results template', 'ORU^R01', '2.5',
'MSH|^~\\&|LAB|{FACILITY}|EMR|{RECEIVING_FACILITY}|{TIMESTAMP}||ORU^R01|{MSG_ID}|P|2.5
PID|1||{PATIENT_ID}^5^M11^{FACILITY}^MR^{FACILITY}||{LAST_NAME}^{FIRST_NAME}^{MIDDLE_NAME}|{DOB}|{GENDER}||{RACE}|{ADDRESS}||(555)555-0123|(555)555-0124||{MARITAL_STATUS}||{SSN}^2^M10^{FACILITY}^SS^A|{PATIENT_ACCOUNT}|
OBR|1|{ORDER_NUMBER}|{RESULT_NUMBER}|{TEST_CODE}^{TEST_NAME}^L|||{OBSERVATION_DATETIME}|||||||||{ORDERING_PROVIDER}||||||{RESULT_DATETIME}|||F
OBX|1|{VALUE_TYPE}|{OBSERVATION_ID}^{OBSERVATION_NAME}^L|1|{OBSERVATION_VALUE}|{UNITS}|{REFERENCE_RANGE}|{ABNORMAL_FLAGS}|||F|||{OBSERVATION_DATETIME}', 'laboratory');
