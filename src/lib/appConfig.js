export const SHOP_ID = "00000000-0000-0000-0000-000000000001";

export const COMPANY_DETAILS = {
  name: "Mahalakshmi Electric Company",
  logoUrl: "/company-logo.png",
  address: "Delhi, India",
  phone: "+91 00000 00000",
  email: "sales@example.com"
};

export const ROLES = {
  master: "Master",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff"
};

export const REGISTRATION_ROLES = {
  manager: "Manager",
  staff: "Staff"
};

export const PERMISSIONS = {
  dashboard: ["master", "owner", "manager", "staff"],
  inventory: ["master", "owner", "manager", "staff"],
  sales: ["master", "owner", "manager", "staff"],
  credit: ["master", "owner", "manager", "staff"],
  manageUsers: ["master"],
  viewAudit: ["master", "owner"],
  finalize: ["master", "owner", "manager"],
  void: ["master", "owner", "manager"],
  export: ["master", "owner", "manager"],
  collectCredit: ["master", "owner", "manager"],
  managePricing: ["master", "owner", "manager"],
  manageProductPricing: ["master", "owner"],
  roleSwitch: ["master"]
};

export const LOW_STOCK_THRESHOLD = 10;

export const PAYMENT_STATUSES = {
  PAID: "Paid",
  UNPAID: "Unpaid"
};

export const PAYMENT_MODES = {
  CASH: "Cash",
  CREDIT: "Credit",
  UPI: "UPI",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other"
};

export const CREDIT_SETTLEMENT_MODES = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other"
};

export const DEBTOR_CATEGORIES = {
  MARKET: "Market",
  OUTSIDER: "Outsider"
};
