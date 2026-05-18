const { sequelize, Doctor, User } = require("../models");
const { VERIFICATION_STATUS } = require("../constants/roles");
const { sendSuccess, sendError } = require("../utils/response");

async function listPendingDoctors(req, res, next) {
  try {
    const doctors = await Doctor.findAll({
      where: { verification_status: VERIFICATION_STATUS.PENDING },
      include: [{ model: User, as: "user", attributes: ["id", "email", "role", "created_at"] }],
      order: [["id", "ASC"]]
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Pending doctors retrieved",
      data: { count: doctors.length, doctors },
      legacy: { count: doctors.length, doctors }
    });
  } catch (err) {
    return next(err);
  }
}

async function verifyDoctor(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action } = req.body; // validated by Joi

    const doctor = await Doctor.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!doctor) {
      await t.rollback();
      return sendError(res, { statusCode: 404, message: "Doctor not found", code: "NOT_FOUND" });
    }

    if (action === "approve") {
      doctor.is_verified = true;
      doctor.verification_status = VERIFICATION_STATUS.APPROVED;
    } else {
      doctor.is_verified = false;
      doctor.verification_status = VERIFICATION_STATUS.REJECTED;
    }
    doctor.verified_at = new Date();
    doctor.verified_by = req.user.sub;

    await doctor.save({ transaction: t });
    await t.commit();

    return sendSuccess(res, {
      statusCode: 200,
      message: `Doctor ${action}d successfully`,
      data: { doctor },
      legacy: { doctor }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

module.exports = { listPendingDoctors, verifyDoctor };
