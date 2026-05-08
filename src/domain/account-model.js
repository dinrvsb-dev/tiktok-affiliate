export const AccountType = { HQ: "HQ", Personal: "Personal" };

export const AccountStatus = {
  Active: "Active",
  Idle: "Idle",
  Expired: "Expired",
  Suspended: "Suspended"
};

export const INACTIVE_THRESHOLD_DAYS = 7;

export function createAccount({ tiktokUsername, password, email, phone, type, notes = "" }) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    tiktokUsername,
    password,
    email: email || "",
    phone: phone || "",
    type,
    status: AccountStatus.Idle,
    currentAffiliate: null,
    lastActiveAt: null,
    notes,
    history: [],
    createdAt: now,
    updatedAt: now
  };
}

export function assignAffiliate(account, { name, phone, startDate }) {
  if (account.currentAffiliate) {
    account.history.push({
      ...account.currentAffiliate,
      endDate: new Date().toISOString()
    });
  }
  account.currentAffiliate = {
    name,
    phone,
    startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString()
  };
  account.status = AccountStatus.Active;
  account.updatedAt = new Date().toISOString();
  return account;
}

export function unassignAffiliate(account) {
  if (account.currentAffiliate) {
    account.history.push({
      ...account.currentAffiliate,
      endDate: new Date().toISOString()
    });
    account.currentAffiliate = null;
  }
  account.status = AccountStatus.Idle;
  account.updatedAt = new Date().toISOString();
  return account;
}

export function markActive(account) {
  account.lastActiveAt = new Date().toISOString();
  account.updatedAt = new Date().toISOString();
  return account;
}

export function isInactive(account) {
  if (!account.lastActiveAt || account.status !== AccountStatus.Active) return false;
  const diffMs = Date.now() - new Date(account.lastActiveAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= INACTIVE_THRESHOLD_DAYS;
}
