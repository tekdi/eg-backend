ALTER TABLE group_users ADD COLUMN dist_to_camp VARCHAR(255);
UPDATE group_users SET dist_to_camp = NULL;

CREATE TABLE api_balance (month SERIAL PRIMARY KEY , balance INTEGER);
INSERT INTO api_balance (balance) SELECT 40000 FROM generate_series(1, 12);
