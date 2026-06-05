CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  memo TEXT,
  snapshot TEXT
);

CREATE TABLE funds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT
);

CREATE TABLE fund_nav (
  fund_id TEXT REFERENCES funds(id),
  date DATE NOT NULL,
  nav NUMERIC(12,4) NOT NULL,
  PRIMARY KEY (fund_id, date)
);

CREATE TABLE holdings (
  fund_id TEXT PRIMARY KEY REFERENCES funds(id),
  fund_name TEXT,
  units NUMERIC(14,6) NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_nav NUMERIC(12,4) NOT NULL
);

CREATE INDEX idx_txn_date ON transactions(date);
CREATE INDEX idx_txn_category ON transactions(category);
CREATE INDEX idx_txn_merchant ON transactions(merchant);
