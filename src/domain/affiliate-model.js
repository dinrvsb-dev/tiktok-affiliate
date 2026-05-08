export const AffiliateStatus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected"
};

export function createAffiliate({ namaLengkap, noFon, emel, alamat, akauntTiktok, namaBank, noAkauntBank }) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: AffiliateStatus.Pending,
    namaLengkap,
    noFon,
    emel,
    alamat,
    akauntTiktok,
    namaBank,
    noAkauntBank,
    submittedAt: now,
    updatedAt: now,
    notes: ""
  };
}
