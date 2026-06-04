const { Doctor, Patient, User, sequelize } = require("../models");
const { sendTextMessage } = require("../services/whatsappService");
const { sendSuccess, sendError } = require("../utils/response");


async function approveDoctor(req, res, next) {
  try {
    const doctorId = req.params.id;

    const doctor = await sequelize.transaction(async (transaction) => {
      const pendingUser = await User.findByPk(doctorId, {
        transaction,
        lock: true
      });

      if (!pendingUser || pendingUser.role !== 'DOCTOR') {
        const err = new Error("Doctor not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
      }

      if (pendingUser.verification_status !== "pending") {
        const err = new Error(`Doctor approval is already ${pendingUser.verification_status}`);
        err.statusCode = 400;
        err.code = "BAD_REQUEST";
        throw err;
      }

      await pendingUser.update({ verification_status: "approved", is_verified: true }, { transaction });
      
      const doctorProfile = await Doctor.unscoped().findOne({ where: { user_id: pendingUser.id }, transaction });
      if (doctorProfile) {
        await doctorProfile.update({ approval_status: "APPROVED" }, { transaction });
      }

      return pendingUser.id;
    });

    const approvedUser = await User.findByPk(doctor, {
      include: [{ model: Doctor, as: "doctor" }]
    });

    const phone = approvedUser.phone;
    if (phone) {
      const docName = approvedUser.doctor ? approvedUser.doctor.name : approvedUser.email;
      sendTextMessage(
        phone,
        `Hello Dr. ${docName}, your account on MediScan AI has been approved! You can now log in and access the diagnostic dashboard.`
      ).catch((error) => {
        // eslint-disable-next-line no-console
        console.warn(`[WhatsApp] Failed to send doctor approval notification to ${phone}:`, error.message);
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor account has been approved successfully.",
      data: {
        doctorId: String(approvedUser.id),
        status: "APPROVED"
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code || "ADMIN_APPROVAL_ERROR"
      });
    }

    return next(error);
  }
}

async function rejectDoctor(req, res, next) {
  try {
    const doctorId = req.params.id;

    const doctor = await sequelize.transaction(async (transaction) => {
      const pendingDoctor = await Doctor.unscoped().findByPk(doctorId, {
        transaction,
        lock: true
      });

      if (!pendingDoctor) {
        const err = new Error("Doctor not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
      }

      if (pendingDoctor.approval_status === "REJECTED") {
        const err = new Error("Doctor account is already rejected");
        err.statusCode = 400;
        err.code = "BAD_REQUEST";
        throw err;
      }

      const pendingUser = await User.findByPk(doctorId, { transaction, lock: true });
      if (!pendingUser) {
        const err = new Error("User not found for this doctor");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
      }
      await pendingUser.update({ verification_status: "rejected" }, { transaction });
      await pendingDoctor.update({ approval_status: "REJECTED" }, { transaction });
      return pendingDoctor.id;
    });

    const rejectedDoctor = await Doctor.findByPk(doctor);

    const phone = rejectedDoctor.phone;
    if (phone) {
      sendTextMessage(
        phone,
        `Hello Dr. ${rejectedDoctor.name}, unfortunately your registration on MediScan AI has been reviewed and rejected. Please contact support for more information.`
      ).catch((error) => {
        // eslint-disable-next-line no-console
        console.warn(`[WhatsApp] Failed to send doctor rejection notification to ${phone}:`, error.message);
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor account has been rejected.",
      data: {
        doctorId: String(rejectedDoctor.id),
        status: "REJECTED"
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code || "ADMIN_REJECTION_ERROR"
      });
    }

    return next(error);
  }
}

async function listDoctors(req, res, next) {
  try {
    const statusFilter = req.query.status ? String(req.query.status).toLowerCase() : 'pending';

    if (statusFilter) {
      const users = await User.findAll({
        where: {
          role: "DOCTOR",
          verification_status: statusFilter
        },
        include: [{ model: Doctor, as: "doctor" }]
      });
      const data = users.map((u) => ({
        id: String(u.id),
        name: u.doctor ? u.doctor.name : "Unknown",
        specialization: u.doctor ? u.doctor.specialization : null,
        phone: u.phone,
        email: u.email,
        medical_certificate: u.doctor ? u.doctor.medical_certificate : null,
        approval_status: u.doctor ? u.doctor.approval_status : null,
        verification_status: u.verification_status
      }));

      return sendSuccess(res, {
        statusCode: 200,
        message: "Doctors retrieved successfully.",
        data
      });
    } else {
      // Fetch all users in the system with their patient/doctor profiles
      const users = await User.findAll({
        include: [
          { model: Doctor, as: "doctor" },
          { model: Patient, as: "patient" }
        ]
      });

      const data = users.map((u) => {
        let name = "Admin";
        let specialization = null;
        let medical_certificate = null;
        let approval_status = null;
        let verification_status = u.is_verified ? "approved" : "pending";

        if (u.role === "DOCTOR" && u.doctor) {
          name = u.doctor.name;
          specialization = u.doctor.specialization;
          medical_certificate = u.doctor.medical_certificate;
          approval_status = u.doctor.approval_status;
          verification_status = u.doctor.approval_status.toLowerCase();
        } else if (u.role === "PATIENT" && u.patient) {
          name = u.patient.name;
        }

        return {
          id: String(u.id),
          name,
          email: u.email,
          role: String(u.role).toLowerCase(),
          phone: u.phone,
          specialization,
          medical_certificate,
          approval_status,
          verification_status
        };
      });

      return sendSuccess(res, {
        statusCode: 200,
        message: "All users retrieved successfully.",
        data
      });
    }
  } catch (error) {
    return next(error);
  }
}

async function suspendUser(req, res, next) {
  try {
    const userId = req.params.id;

    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction, lock: true });

      if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
      }

      if (user.role === 'ADMIN') {
        const err = new Error("Cannot suspend another admin");
        err.statusCode = 403;
        err.code = "FORBIDDEN";
        throw err;
      }

      if (user.verification_status === "suspended") {
        const err = new Error("User is already suspended");
        err.statusCode = 400;
        err.code = "BAD_REQUEST";
        throw err;
      }

      await user.update({ verification_status: "suspended", is_verified: false }, { transaction });
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "User account has been suspended.",
      data: {
        userId: String(userId),
        status: "SUSPENDED"
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code || "ADMIN_SUSPENSION_ERROR"
      });
    }

    return next(error);
  }
}

module.exports = {
  approveDoctor,
  rejectDoctor,
  suspendUser,
  listDoctors
};
