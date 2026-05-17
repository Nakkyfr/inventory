export const SHOP_ID = "00000000-0000-0000-0000-000000000001";

export const COMPANY_DETAILS = {
  name: "Mahalakshmi Electric Company",
  logoUrl: "/company-logo.png",
  address: "Delhi, India",
  phone: "+91 00000 00000",
  email: "sales@example.com"
};

export const ROLES = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff"
};

export const PERMISSIONS = {
  dashboard: ["owner", "manager", "staff"],
  inventory: ["owner", "manager", "staff"],
  sales: ["owner", "manager", "staff"],
  returns: ["owner", "manager", "staff"],
  finalize: ["owner", "manager"],
  void: ["owner", "manager"],
  export: ["owner", "manager"],
  roleSwitch: ["owner"]
};

export const LOW_STOCK_THRESHOLD = 10;

export const PAYMENT_STATUSES = {
  PAID: "Paid",
  UNPAID: "Unpaid"
};
