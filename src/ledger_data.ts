export interface LedgerFile {
  name: string;
  language: string;
  path: string;
  description: string;
  code: string;
}

export const LEDGER_FILES: LedgerFile[] = [
  {
    name: 'models.py',
    language: 'python',
    path: 'src/models.py',
    description: 'Domain model dataclasses mirroring the database schema. These are plain data holders used to build balanced journal entries in application memory before they are posted to the database. They do NOT contain any ORM layer mappings.',
    code: `from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from uuid import UUID


class AccountType(str, Enum):
    CUSTOMER_WALLET = "customer_wallet"
    BANK_CLEARING = "bank_clearing"
    FX_CLEARING = "fx_clearing"
    FEE_REVENUE = "fee_revenue"
    PLATFORM_FLOAT = "platform_float"
    SUSPENSE = "suspense"


class EntryType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    CONVERSION = "conversion"
    FEE = "fee"
    REVERSAL = "reversal"
    ADJUSTMENT = "adjustment"


class Direction(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


@dataclass
class Account:
    id: UUID
    currency_code: str
    account_type: AccountType
    display_name: str
    owner_user_id: Optional[UUID] = None


@dataclass
class JournalLine:
    account_id: UUID
    currency_code: str
    direction: Direction
    amount_minor: int  # always positive; sign comes from \`direction\`

    def __post_init__(self):
        if self.amount_minor <= 0:
            raise ValueError("amount_minor must be positive; use \`direction\` for sign")


@dataclass
class JournalEntry:
    entry_type: EntryType
    idempotency_key: str
    created_by: str
    lines: list[JournalLine] = field(default_factory=list)
    description: Optional[str] = None
    conversion_id: Optional[UUID] = None
    reversal_of_entry_id: Optional[UUID] = None

    def is_balanced(self) -> bool:
        """Debits must equal credits, per currency, within this entry."""
        totals: dict[str, int] = {}
        for line in self.lines:
            sign = 1 if line.direction == Direction.CREDIT else -1
            totals[line.currency_code] = totals.get(line.currency_code, 0) + sign * line.amount_minor
        return all(total == 0 for total in totals.values())`
  },
  {
    name: 'ledger_service.py',
    language: 'python',
    path: 'src/ledger_service.py',
    description: 'The core transactional posting engine. This is the ONLY code path in the system allowed to write to the journal_entries and journal_lines tables. Every high-level operations helper must route through this service to ensure atomic balance checks and serialize concurrent postings to the same accounts.',
    code: `import psycopg2
from uuid import UUID

from .db import transaction
from .models import JournalEntry
from .exceptions import (
    UnbalancedEntryError,
    DuplicateEntryError,
)


def post_entry(entry: JournalEntry) -> UUID:
    """
    Post a single balanced JournalEntry atomically.

    Validates balance in application code first (fast fail), then relies
    on the DB's deferred constraint trigger as a second line of defense
    against bugs or races. Idempotency is enforced via the unique
    idempotency_key constraint on journal_entries.
    """
    if not entry.lines:
        raise UnbalancedEntryError("Entry has no lines")
    if not entry.is_balanced():
        raise UnbalancedEntryError(f"Entry {entry.idempotency_key} is not balanced")

    with transaction() as (conn, cur):
        try:
            cur.execute(
                """
                INSERT INTO journal_entries
                    (entry_type, description, idempotency_key, conversion_id,
                     reversal_of_entry_id, created_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    entry.entry_type.value,
                    entry.description,
                    entry.idempotency_key,
                    str(entry.conversion_id) if entry.conversion_id else None,
                    str(entry.reversal_of_entry_id) if entry.reversal_of_entry_id else None,
                    entry.created_by,
                ),
            )
            entry_id = cur.fetchone()[0]

            for line in entry.lines:
                # Lock the account row to serialize concurrent posts to the
                # same account and avoid lost updates on account_balances.
                cur.execute(
                    "SELECT id FROM accounts WHERE id = %s FOR UPDATE",
                    (str(line.account_id),),
                )
                if cur.fetchone() is None:
                    raise ValueError(f"Account {line.account_id} not found")

                cur.execute(
                    """
                    INSERT INTO journal_lines
                        (entry_id, account_id, currency_code, direction, amount_minor)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        str(entry_id),
                        str(line.account_id),
                        line.currency_code,
                        line.direction.value,
                        line.amount_minor,
                    ),
                )
            # The deferred balance-check trigger fires at COMMIT (end of
            # the \`with transaction()\` block), and will raise/rollback if
            # debits != credits per currency for this entry.
            return entry_id

        except psycopg2.errors.UniqueViolation as exc:
            raise DuplicateEntryError(
                f"Entry with idempotency_key={entry.idempotency_key!r} already posted"
            ) from exc


def post_conversion(leg_a: JournalEntry, leg_b: JournalEntry, conversion_id: UUID) -> tuple[UUID, UUID]:
    """
    Post the two linked legs of an FX conversion (see ARCHITECTURE.md
    section 3.3). Both legs share a conversion_id so they can be queried
    and reconciled together; each leg is independently balanced in its
    own currency.
    """
    leg_a.conversion_id = conversion_id
    leg_b.conversion_id = conversion_id
    entry_a_id = post_entry(leg_a)
    entry_b_id = post_entry(leg_b)
    return entry_a_id, entry_b_id


def get_balance(account_id: UUID) -> int:
    """Read the cached balance (minor units) for an account."""
    with transaction() as (conn, cur):
        cur.execute(
            "SELECT balance_minor FROM account_balances WHERE account_id = %s",
            (str(account_id),),
        )
        row = cur.fetchone()
        return row[0] if row else 0


def get_recomputed_balance(account_id: UUID) -> int:
    """Slow-path balance, recomputed directly from journal_lines. Used by
    the reconciliation job to detect drift in account_balances."""
    with transaction() as (conn, cur):
        cur.execute(
            """
            SELECT COALESCE(SUM(
                CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END
            ), 0)
            FROM journal_lines WHERE account_id = %s
            """,
            (str(account_id),),
        )
        return cur.fetchone()[0]`
  },
  {
    name: 'operations.py',
    language: 'python',
    path: 'src/operations.py',
    description: 'Thin, high-level business helpers that build correctly-balanced JournalEntry structures for everyday ledger events like deposit, withdrawal, p2p transfer, FX conversions, and platform fee charging, and safely submit them to the transactional ledger service.',
    code: `from uuid import UUID, uuid4

from .models import JournalEntry, JournalLine, EntryType, Direction
from .ledger_service import post_entry, post_conversion


def deposit(
    *,
    customer_wallet_account_id: UUID,
    bank_clearing_account_id: UUID,
    currency_code: str,
    amount_minor: int,
    idempotency_key: str,
    created_by: str,
) -> UUID:
    """Money arrives from a bank/payment partner into a user's wallet."""
    entry = JournalEntry(
        entry_type=EntryType.DEPOSIT,
        idempotency_key=idempotency_key,
        created_by=created_by,
        description=f"Deposit {amount_minor} {currency_code} minor units",
        lines=[
            JournalLine(bank_clearing_account_id, currency_code, Direction.DEBIT, amount_minor),
            JournalLine(customer_wallet_account_id, currency_code, Direction.CREDIT, amount_minor),
        ],
    )
    return post_entry(entry)


def withdraw(
    *,
    customer_wallet_account_id: UUID,
    bank_clearing_account_id: UUID,
    currency_code: str,
    amount_minor: int,
    idempotency_key: str,
    created_by: str,
) -> UUID:
    """User pulls money out to a bank account / mobile money, etc."""
    entry = JournalEntry(
        entry_type=EntryType.WITHDRAWAL,
        idempotency_key=idempotency_key,
        created_by=created_by,
        description=f"Withdrawal {amount_minor} {currency_code} minor units",
        lines=[
            JournalLine(customer_wallet_account_id, currency_code, Direction.DEBIT, amount_minor),
            JournalLine(bank_clearing_account_id, currency_code, Direction.CREDIT, amount_minor),
        ],
    )
    return post_entry(entry)


def transfer(
    *,
    from_wallet_account_id: UUID,
    to_wallet_account_id: UUID,
    currency_code: str,
    amount_minor: int,
    idempotency_key: str,
    created_by: str,
) -> UUID:
    """User-to-user transfer within the same currency."""
    entry = JournalEntry(
        entry_type=EntryType.TRANSFER,
        idempotency_key=idempotency_key,
        created_by=created_by,
        description=f"Transfer {amount_minor} {currency_code} minor units",
        lines=[
            JournalLine(from_wallet_account_id, currency_code, Direction.DEBIT, amount_minor),
            JournalLine(to_wallet_account_id, currency_code, Direction.CREDIT, amount_minor),
        ],
    )
    return post_entry(entry)


def charge_fee(
    *,
    customer_wallet_account_id: UUID,
    fee_revenue_account_id: UUID,
    currency_code: str,
    amount_minor: int,
    idempotency_key: str,
    created_by: str,
) -> UUID:
    entry = JournalEntry(
        entry_type=EntryType.FEE,
        idempotency_key=idempotency_key,
        created_by=created_by,
        description=f"Fee {amount_minor} {currency_code} minor units",
        lines=[
            JournalLine(customer_wallet_account_id, currency_code, Direction.DEBIT, amount_minor),
            JournalLine(fee_revenue_account_id, currency_code, Direction.CREDIT, amount_minor),
        ],
    )
    return post_entry(entry)


def convert_currency(
    *,
    from_wallet_account_id: UUID,
    from_currency_code: str,
    from_amount_minor: int,
    from_fx_clearing_account_id: UUID,
    to_wallet_account_id: UUID,
    to_currency_code: str,
    to_amount_minor: int,
    to_fx_clearing_account_id: UUID,
    idempotency_key: str,
    created_by: str,
) -> tuple[UUID, UUID]:
    """
    Convert funds from one currency wallet to another at a given rate.
    \`to_amount_minor\` should already reflect the rate applied upstream
    (rate sourcing/storage is out of scope of this skeleton).
    """
    conversion_id = uuid4()

    leg_a = JournalEntry(
        entry_type=EntryType.CONVERSION,
        idempotency_key=f"{idempotency_key}:a",
        created_by=created_by,
        description=f"Convert {from_amount_minor} {from_currency_code} -> {to_currency_code}",
        lines=[
            JournalLine(from_wallet_account_id, from_currency_code, Direction.DEBIT, from_amount_minor),
            JournalLine(from_fx_clearing_account_id, from_currency_code, Direction.CREDIT, from_amount_minor),
        ],
    )
    leg_b = JournalEntry(
        entry_type=EntryType.CONVERSION,
        idempotency_key=f"{idempotency_key}:b",
        created_by=created_by,
        description=f"Convert {from_currency_code} -> {to_amount_minor} {to_currency_code}",
        lines=[
            JournalLine(to_fx_clearing_account_id, to_currency_code, Direction.DEBIT, to_amount_minor),
            JournalLine(to_wallet_account_id, to_currency_code, Direction.CREDIT, to_amount_minor),
        ],
    )
    return post_conversion(leg_a, leg_b, conversion_id)`
  },
  {
    name: 'currencies.py',
    language: 'python',
    path: 'src/currencies.py',
    description: 'Minor-unit conversion helper utilities for 12+ African currencies. Enforces clean arithmetic on Decimals and outputs standard integers, insulating the entire codebase from float precision issues when tracking financial balances.',
    code: `from decimal import Decimal, ROUND_HALF_UP

# Mirrors the \`minor_unit\` column in the \`currencies\` table.
# Kept here too for fast in-process lookups; DB remains source of truth.
CURRENCY_MINOR_UNITS = {
    "ZAR": 2,
    "NGN": 2,
    "KES": 2,
    "GHS": 2,
    "EGP": 2,
    "XOF": 0,
    "XAF": 0,
    "TZS": 2,
    "UGX": 0,
    "MAD": 2,
    "ETB": 2,
    "RWF": 0,
}


def to_minor_units(amount: Decimal, currency_code: str) -> int:
    """Convert a human-readable decimal amount (e.g. Decimal(\'1000.50\'))
    into an integer count of minor units (e.g. 100050 cents)."""
    places = CURRENCY_MINOR_UNITS[currency_code]
    quantum = Decimal(1).scaleb(-places)
    scaled = amount.quantize(quantum, rounding=ROUND_HALF_UP)
    return int(scaled.scaleb(places))


def to_major_units(amount_minor: int, currency_code: str) -> Decimal:
    """Convert minor units back into a human-readable Decimal."""
    places = CURRENCY_MINOR_UNITS[currency_code]
    return Decimal(amount_minor).scaleb(-places)`
  },
  {
    name: 'db.py',
    language: 'python',
    path: 'src/db.py',
    description: 'PostgreSQL thread-safe connection pooling and atomic transaction managers using psycopg2. Simplifies connection checkout and ensures clean, auto-committed transactions that revert instantly on exceptions.',
    code: `import os
import contextlib
import psycopg2
from psycopg2.pool import ThreadedConnectionPool

_POOL: ThreadedConnectionPool | None = None


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    global _POOL
    if _POOL is not None:
        return
    _POOL = ThreadedConnectionPool(
        minconn,
        maxconn,
        dsn=os.environ["LEDGER_DATABASE_URL"],  # e.g. postgresql://user:pass@host/dbname
    )


@contextlib.contextmanager
def get_connection():
    """Yield a connection from the pool, returning it when done."""
    if _POOL is None:
        init_pool()
    conn = _POOL.getconn()
    try:
        yield conn
    finally:
        _POOL.putconn(conn)


@contextlib.contextmanager
def transaction():
    """
    Yield a (connection, cursor) pair inside a single DB transaction.
    Commits on clean exit, rolls back on exception.
    """
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            yield conn, cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()`
  },
  {
    name: 'exceptions.py',
    language: 'python',
    path: 'src/exceptions.py',
    description: 'Domain-specific exception classes defining operational boundaries and validation failures inside the double-entry bookkeeping ledger.',
    code: `class LedgerError(Exception):
    """Base class for all ledger-related errors."""


class UnbalancedEntryError(LedgerError):
    """Raised when a JournalEntry\'s debits and credits don\'t match per currency."""


class CurrencyMismatchError(LedgerError):
    """Raised when a line\'s currency doesn\'t match its account\'s currency."""


class DuplicateEntryError(LedgerError):
    """Raised when an idempotency_key has already been used (entry already posted)."""


class AccountNotFoundError(LedgerError):
    """Raised when an account_id referenced in a line doesn\'t exist."""


class InsufficientFundsError(LedgerError):
    """Raised when a withdrawal/transfer would take a wallet account negative
    (only relevant for account types that disallow negative balances)."""`
  },
  {
    name: 'example_usage.py',
    language: 'python',
    path: 'example_usage.py',
    description: 'E2E implementation workflow demonstrating how developers can wire up deposits, transfers, and FX multi-currency conversions using the domain-model abstractions.',
    code: `from decimal import Decimal
from uuid import uuid4

from src.currencies import to_minor_units
from src.operations import deposit, transfer, convert_currency


def example():
    jane_zar_wallet = uuid4()       # would come from \`accounts\` table lookup
    bank_clearing_zar = uuid4()
    jane_kes_wallet = uuid4()
    fx_clearing_zar = uuid4()
    fx_clearing_kes = uuid4()
    thabo_zar_wallet = uuid4()

    # 1. Jane deposits R1,000.00
    deposit(
        customer_wallet_account_id=jane_zar_wallet,
        bank_clearing_account_id=bank_clearing_zar,
        currency_code="ZAR",
        amount_minor=to_minor_units(Decimal("1000.00"), "ZAR"),
        idempotency_key="deposit-req-001",
        created_by="payments-service",
    )

    # 2. Jane sends R250 to Thabo
    transfer(
        from_wallet_account_id=jane_zar_wallet,
        to_wallet_account_id=thabo_zar_wallet,
        currency_code="ZAR",
        amount_minor=to_minor_units(Decimal("250.00"), "ZAR"),
        idempotency_key="transfer-req-001",
        created_by="transfers-service",
    )

    # 3. Jane converts R500 to KES at an upstream-sourced rate of 7.4
    convert_currency(
        from_wallet_account_id=jane_zar_wallet,
        from_currency_code="ZAR",
        from_amount_minor=to_minor_units(Decimal("500.00"), "ZAR"),
        from_fx_clearing_account_id=fx_clearing_zar,
        to_wallet_account_id=jane_kes_wallet,
        to_currency_code="KES",
        to_amount_minor=to_minor_units(Decimal("3700.00"), "KES"),
        to_fx_clearing_account_id=fx_clearing_kes,
        idempotency_key="convert-req-001",
        created_by="fx-service",
    )


if __name__ == "__main__":
    example()`
  },
  {
    name: 'schema.sql',
    language: 'sql',
    path: 'schema.sql',
    description: 'Production-ready PostgreSQL relational DDL. Configures automated plpgsql trigger functions to enforce strict cross-line currency validation, check balanced entries deferred at the transaction commit boundary, and maintain synchronized real-time materialized account balance caches.',
    code: `-- Afriquant Xchange — Multi-Currency Ledger Schema
-- PostgreSQL 14+
-- Double-entry bookkeeping core: currencies, accounts, journal entries/lines.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Currencies
-- ============================================================
CREATE TABLE currencies (
    code            CHAR(3) PRIMARY KEY,       -- ISO 4217, e.g. 'ZAR', 'KES', 'NGN'
    name            TEXT NOT NULL,
    minor_unit      SMALLINT NOT NULL DEFAULT 2, -- decimal places (cents = 2, some = 0)
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: 10+ major African currencies at launch
INSERT INTO currencies (code, name, minor_unit) VALUES
    ('ZAR', 'South African Rand', 2),
    ('NGN', 'Nigerian Naira', 2),
    ('KES', 'Kenyan Shilling', 2),
    ('GHS', 'Ghanaian Cedi', 2),
    ('EGP', 'Egyptian Pound', 2),
    ('XOF', 'West African CFA Franc', 0),
    ('XAF', 'Central African CFA Franc', 0),
    ('TZS', 'Tanzanian Shilling', 2),
    ('UGX', 'Ugandan Shilling', 0),
    ('MAD', 'Moroccan Dirham', 2),
    ('ETB', 'Ethiopian Birr', 2),
    ('RWF', 'Rwandan Franc', 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Accounts (chart of accounts)
-- ============================================================
CREATE TYPE account_type AS ENUM (
    'customer_wallet',      -- liability: platform owes the user
    'bank_clearing',        -- asset: in-transit bank settlement
    'fx_clearing',          -- bridges cross-currency conversions
    'fee_revenue',          -- revenue
    'platform_float',       -- platform's own operating cash
    'suspense'              -- temporary holding for investigation
);

CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID,                       -- NULL for system accounts
    account_type    account_type NOT NULL,
    currency_code   CHAR(3) NOT NULL REFERENCES currencies(code),
    display_name    TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A user has at most one wallet account per currency.
    CONSTRAINT uq_customer_wallet UNIQUE (owner_user_id, currency_code, account_type)
);

CREATE INDEX idx_accounts_owner ON accounts (owner_user_id);
CREATE INDEX idx_accounts_currency ON accounts (currency_code);

-- ============================================================
-- 3. Journal entries (the "header" of a balanced transaction)
-- ============================================================
CREATE TYPE entry_type AS ENUM (
    'deposit', 'withdrawal', 'transfer', 'conversion', 'fee', 'reversal', 'adjustment'
);

CREATE TABLE journal_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type          entry_type NOT NULL,
    description         TEXT,
    idempotency_key     TEXT NOT NULL UNIQUE,
    conversion_id       UUID,             -- links the two legs of an FX conversion
    reversal_of_entry_id UUID REFERENCES journal_entries(id),
    created_by          TEXT NOT NULL,    -- service/user that initiated this
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_conversion ON journal_entries (conversion_id);
CREATE INDEX idx_entries_created_at ON journal_entries (created_at);

-- ============================================================
-- 4. Journal lines (the actual debit/credit rows)
-- ============================================================
CREATE TYPE entry_direction AS ENUM ('debit', 'credit');

CREATE TABLE journal_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES journal_entries(id),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    currency_code   CHAR(3) NOT NULL REFERENCES currencies(code),
    direction       entry_direction NOT NULL,
    amount_minor    BIGINT NOT NULL CHECK (amount_minor > 0), -- always positive; sign is via direction
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lines_entry ON journal_lines (entry_id);
CREATE INDEX idx_lines_account ON journal_lines (account_id, created_at);

-- Lines must reference an account whose currency matches the line's currency.
CREATE OR REPLACE FUNCTION check_line_currency_matches_account()
RETURNS TRIGGER AS $$
DECLARE
    acct_currency CHAR(3);
BEGIN
    SELECT currency_code INTO acct_currency FROM accounts WHERE id = NEW.account_id;
    IF acct_currency IS DISTINCT FROM NEW.currency_code THEN
        RAISE EXCEPTION 'journal_line currency % does not match account currency %',
            NEW.currency_code, acct_currency;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_line_currency
    BEFORE INSERT ON journal_lines
    FOR EACH ROW EXECUTE FUNCTION check_line_currency_matches_account();

-- ============================================================
-- 5. Balance enforcement: debits == credits per (entry, currency)
--    Deferred constraint trigger, checked at COMMIT, so lines can be
--    inserted one at a time within a transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_balanced_entry()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT currency_code,
               SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END) AS debits,
               SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END) AS credits
        FROM journal_lines
        WHERE entry_id = NEW.entry_id
        GROUP BY currency_code
    LOOP
        IF rec.debits <> rec.credits THEN
            RAISE EXCEPTION
                'Unbalanced journal entry %: currency % debits=% credits=%',
                NEW.entry_id, rec.currency_code, rec.debits, rec.credits;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_enforce_balanced_entry
    AFTER INSERT ON journal_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION enforce_balanced_entry();

-- ============================================================
-- 6. Materialized account balances (read-optimized cache)
-- ============================================================
CREATE TABLE account_balances (
    account_id      UUID PRIMARY KEY REFERENCES accounts(id),
    currency_code   CHAR(3) NOT NULL REFERENCES currencies(code),
    balance_minor   BIGINT NOT NULL DEFAULT 0,  -- net of credits - debits (liability sign)
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep the cache in sync whenever a line is inserted.
CREATE OR REPLACE FUNCTION apply_line_to_balance()
RETURNS TRIGGER AS $$
DECLARE
    delta BIGINT;
BEGIN
    delta := CASE WHEN NEW.direction = 'credit' THEN NEW.amount_minor ELSE -NEW.amount_minor END;

    INSERT INTO account_balances (account_id, currency_code, balance_minor, updated_at)
    VALUES (NEW.account_id, NEW.currency_code, delta, now())
    ON CONFLICT (account_id)
    DO UPDATE SET balance_minor = account_balances.balance_minor + delta,
                  updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_line_to_balance
    AFTER INSERT ON journal_lines
    FOR EACH ROW EXECUTE FUNCTION apply_line_to_balance();

-- ============================================================
-- 7. Reconciliation helper view: recompute balance from source of truth
-- ============================================================
CREATE VIEW account_balances_recomputed AS
SELECT
    account_id,
    currency_code,
    SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END) AS balance_minor
FROM journal_lines
GROUP BY account_id, currency_code;`
  }
];
