/**
 * EMI Calculator Utility (emiCalculator.js)
 * -----------------------------------------
 * Derives accurate, real-time metrics for any EMI document:
 * - Months completed & remaining
 * - Installments paid & remaining
 * - Total amount paid & balance remaining
 * - Dynamic next due date (month advancing)
 * - Loan end date
 * - Percentage completed
 * - Live status: 'active', 'due_soon', 'overdue', 'completed'
 */

/**
 * Creates a Date safely clamped to the valid days of target month (e.g. Feb 30 -> Feb 28/29)
 */
export const getSafeMonthDate = (year, monthIndex, targetDay) => {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = Math.min(targetDay, lastDayOfMonth);
  return new Date(year, monthIndex, clampedDay, 12, 0, 0, 0);
};

/**
 * Calculates enriched properties for an EMI record
 */
export const enrichEMI = (emiDoc) => {
  const emi = emiDoc.toObject ? emiDoc.toObject() : { ...emiDoc };
  const payments = Array.isArray(emi.payments) ? emi.payments : [];

  const tenureMonths = Number(emi.tenureMonths) || 1;
  const totalAmount = Number(emi.totalAmount) || 0;
  const monthlyAmount = Number(emi.monthlyAmount) || 0;
  const dueDay = Number(emi.dueDay) || 5;

  // Payments aggregation
  const installmentsPaid = payments.length;
  const installmentsRemaining = Math.max(0, tenureMonths - installmentsPaid);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

  const completionPercentage = Math.min(
    100,
    Math.round((installmentsPaid / tenureMonths) * 100)
  );

  const startDate = new Date(emi.startDate || Date.now());

  // Calculate projected Loan End Date (startDate + tenureMonths)
  const endYear = startDate.getFullYear();
  const endMonth = startDate.getMonth() + tenureMonths;
  const endDate = getSafeMonthDate(endYear, endMonth, dueDay);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const isCompleted = installmentsPaid >= tenureMonths || remainingAmount <= 0;

  let nextDueDate = null;
  let daysUntilDue = null;
  let liveStatus = 'active';

  if (isCompleted) {
    liveStatus = 'completed';
  } else {
    // Next due installment is the (installmentsPaid)-th month after start
    const nextYear = startDate.getFullYear();
    const nextMonth = startDate.getMonth() + installmentsPaid;
    nextDueDate = getSafeMonthDate(nextYear, nextMonth, dueDay);

    const diffMs = nextDueDate.getTime() - now.getTime();
    daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      liveStatus = 'overdue';
    } else if (daysUntilDue <= 3) {
      liveStatus = 'due_soon';
    } else {
      liveStatus = 'active';
    }
  }

  return {
    ...emi,
    totalTenure: tenureMonths,
    monthsCompleted: installmentsPaid,
    monthsRemaining: installmentsRemaining,
    installmentsPaid,
    installmentsRemaining,
    totalPaid: Math.round(totalPaid * 100) / 100,
    remainingAmount,
    completionPercentage,
    endDate,
    nextDueDate,
    daysUntilDue,
    status: liveStatus,
    isCompleted,
  };
};

/**
 * Calculates dashboard-level commitment aggregations across a list of enriched EMIs
 */
export const calculateEMISummary = (enrichedEmis) => {
  let activeCount = 0;
  let totalMonthlyCommitment = 0;
  let totalRemainingAmount = 0;
  let totalFinanced = 0;
  let totalPaidAll = 0;

  const dueSoonList = [];
  const recentlyCompleted = [];

  enrichedEmis.forEach((e) => {
    totalFinanced += e.totalAmount || 0;
    totalPaidAll += e.totalPaid || 0;

    if (!e.isCompleted) {
      activeCount++;
      totalMonthlyCommitment += e.monthlyAmount || 0;
      totalRemainingAmount += e.remainingAmount || 0;

      if (e.daysUntilDue !== null && e.daysUntilDue <= 3) {
        dueSoonList.push(e);
      }
    } else {
      recentlyCompleted.push(e);
    }
  });

  // Sort due soon list by urgency (closest deadline first)
  dueSoonList.sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999));

  return {
    activeCount,
    totalMonthlyCommitment: Math.round(totalMonthlyCommitment * 100) / 100,
    totalRemainingAmount: Math.round(totalRemainingAmount * 100) / 100,
    totalFinanced: Math.round(totalFinanced * 100) / 100,
    totalPaidAll: Math.round(totalPaidAll * 100) / 100,
    dueSoonCount: dueSoonList.length,
    dueSoonList,
    recentlyCompleted,
  };
};
