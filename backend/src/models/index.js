const sequelize = require("../config/db");
const DoctorFactory = require("./Doctor");
const PatientFactory = require("./Patient");
const XrayImageFactory = require("./XrayImage");
const ResultImageFactory = require("./ResultImage");
const DiagnosisReportFactory = require("./DiagnosisReport");

const Doctor = DoctorFactory(sequelize);
const Patient = PatientFactory(sequelize);
const XrayImage = XrayImageFactory(sequelize);
const ResultImage = ResultImageFactory(sequelize);
const DiagnosisReport = DiagnosisReportFactory(sequelize);

Patient.hasMany(XrayImage, { foreignKey: "patient_id" });
Doctor.hasMany(XrayImage, { foreignKey: "doctor_id" });
XrayImage.belongsTo(Patient, { foreignKey: "patient_id" });
XrayImage.belongsTo(Doctor, { foreignKey: "doctor_id" });

XrayImage.hasOne(ResultImage, { foreignKey: "xray_id" });
ResultImage.belongsTo(XrayImage, { foreignKey: "xray_id" });

Patient.hasMany(DiagnosisReport, { foreignKey: "patient_id" });
Doctor.hasMany(DiagnosisReport, { foreignKey: "doctor_id" });
ResultImage.hasMany(DiagnosisReport, { foreignKey: "result_id" });
DiagnosisReport.belongsTo(Patient, { foreignKey: "patient_id" });
DiagnosisReport.belongsTo(Doctor, { foreignKey: "doctor_id" });
DiagnosisReport.belongsTo(ResultImage, { foreignKey: "result_id" });

module.exports = {
  sequelize,
  Doctor,
  Patient,
  XrayImage,
  ResultImage,
  DiagnosisReport
};
