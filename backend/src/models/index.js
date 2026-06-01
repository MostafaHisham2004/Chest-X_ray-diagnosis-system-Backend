const sequelize = require("../config/db");
const UserFactory = require("./User");
const DoctorFactory = require("./Doctor");
const PatientFactory = require("./Patient");
const XrayImageFactory = require("./XrayImage");
const ResultImageFactory = require("./ResultImage");
const DiagnosisReportFactory = require("./DiagnosisReport");
const ChatThreadFactory = require("./ChatThread");
const ChatMessageFactory = require("./ChatMessage");
const PatientDoctorConnectionFactory = require("./PatientDoctorConnection");

const User = UserFactory(sequelize);
const Doctor = DoctorFactory(sequelize);
const Patient = PatientFactory(sequelize);
const XrayImage = XrayImageFactory(sequelize);
const ResultImage = ResultImageFactory(sequelize);
const DiagnosisReport = DiagnosisReportFactory(sequelize);
const ChatThread = ChatThreadFactory(sequelize);
const ChatMessage = ChatMessageFactory(sequelize);
const PatientDoctorConnection = PatientDoctorConnectionFactory(sequelize);

User.hasOne(Patient, { foreignKey: "user_id", as: "patientProfile", onDelete: "CASCADE" });
Patient.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasOne(Doctor, { foreignKey: "user_id", as: "doctorProfile", onDelete: "CASCADE" });
Doctor.belongsTo(User, { foreignKey: "user_id", as: "user" });

Patient.hasMany(XrayImage, { foreignKey: "patient_id", onDelete: "CASCADE" });
Doctor.hasMany(XrayImage, { foreignKey: "doctor_id", onDelete: "SET NULL" });
XrayImage.belongsTo(Patient, { foreignKey: "patient_id" });
XrayImage.belongsTo(Doctor, { foreignKey: "doctor_id" });

XrayImage.hasOne(ResultImage, { foreignKey: "xray_id", onDelete: "CASCADE" });
ResultImage.belongsTo(XrayImage, { foreignKey: "xray_id" });

Patient.hasMany(DiagnosisReport, { foreignKey: "patient_id", onDelete: "CASCADE" });
Doctor.hasMany(DiagnosisReport, { foreignKey: "doctor_id", onDelete: "CASCADE" });
ResultImage.hasMany(DiagnosisReport, { foreignKey: "result_id", onDelete: "CASCADE" });
DiagnosisReport.belongsTo(Patient, { foreignKey: "patient_id" });
DiagnosisReport.belongsTo(Doctor, { foreignKey: "doctor_id" });
DiagnosisReport.belongsTo(ResultImage, { foreignKey: "result_id" });

Patient.hasMany(ChatThread, { foreignKey: "patient_id", as: "chatThreads", onDelete: "CASCADE" });
Doctor.hasMany(ChatThread, { foreignKey: "doctor_id", as: "chatThreads", onDelete: "CASCADE" });
ChatThread.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });
ChatThread.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

ChatThread.hasMany(ChatMessage, { foreignKey: "thread_id", as: "messages", onDelete: "CASCADE" });
ChatMessage.belongsTo(ChatThread, { foreignKey: "thread_id", as: "thread" });
User.hasMany(ChatMessage, { foreignKey: "sender_user_id", as: "sentChatMessages", onDelete: "CASCADE" });
ChatMessage.belongsTo(User, { foreignKey: "sender_user_id", as: "sender" });

Doctor.hasMany(PatientDoctorConnection, { foreignKey: "doctor_id", as: "connectionRequests", onDelete: "CASCADE" });
PatientDoctorConnection.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });
Patient.hasMany(PatientDoctorConnection, { foreignKey: "linked_patient_id", as: "connectionRequests", onDelete: "SET NULL" });
PatientDoctorConnection.belongsTo(Patient, { foreignKey: "linked_patient_id", as: "patient" });

module.exports = {
  sequelize,
  User,
  Doctor,
  Patient,
  XrayImage,
  ResultImage,
  DiagnosisReport,
  ChatThread,
  ChatMessage,
  PatientDoctorConnection
};
