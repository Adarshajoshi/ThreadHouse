import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg
import bcrypt
from dotenv import load_dotenv

# Load backend/.env regardless of where the script is invoked from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DB_CONFIG = {
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME",     "mindless"),
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
}


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


async def main(args: argparse.Namespace) -> int:
    conn = await asyncpg.connect(**DB_CONFIG)
    try:
        # Make sure the users table exists (it should, but be defensive in case
        # the user runs this script before ever booting uvicorn).
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL      PRIMARY KEY,
                name          TEXT,
                email         TEXT        UNIQUE NOT NULL,
                password_hash TEXT        NOT NULL,
                role          TEXT        NOT NULL DEFAULT 'user',
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

        existing = await conn.fetchrow(
            "SELECT id, role FROM users WHERE email = $1", args.email
        )

        if existing:
            if args.reset_password:
                await conn.execute(
                    "UPDATE users SET role = 'admin', password_hash = $1 WHERE email = $2",
                    hash_password(args.password),
                    args.email,
                )
                action = "promoted to admin AND password reset"
            else:
                await conn.execute(
                    "UPDATE users SET role = 'admin' WHERE email = $1",
                    args.email,
                )
                action = "promoted to admin (existing password kept)"
        else:
            await conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role)
                VALUES ($1, $2, $3, 'admin')
                """,
                args.name,
                args.email,
                hash_password(args.password),
            )
            action = "created as admin"

        print()
        print("=" * 60)
        print(f"User {args.email!r} {action}.")
        print("=" * 60)
        print(f"  email:    {args.email}")
        if not existing or args.reset_password:
            print(f"  password: {args.password}")
        else:
            print(f"  password: (unchanged — whatever you signed up with)")
        print(f"  name:     {args.name}")
        print(f"  role:     admin")
        print()
        print(f"Login at: POST http://localhost:8000/api/auth/admin/login")
        print(f"  body:   {{\"email\": \"{args.email}\", \"password\": \"...\"}}")
        print()

    finally:
        await conn.close()

    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Create or promote an admin user.")
    p.add_argument("--email",    default="admin@threadhouse.com")
    p.add_argument("--password", default="Admin@123")
    p.add_argument("--name",     default="Admin")
    p.add_argument(
        "--reset-password",
        action="store_true",
        help="If user exists, also reset their password to --password.",
    )
    args = p.parse_args()

    try:
        sys.exit(asyncio.run(main(args)))
    except asyncpg.InvalidPasswordError:
        print("ERROR: Postgres rejected DB_PASSWORD. Check backend/.env.")
        sys.exit(1)
    except asyncpg.InvalidCatalogNameError:
        print(f"ERROR: database {DB_CONFIG['database']!r} does not exist.")
        print("       Create it first:  CREATE DATABASE mindless;")
        sys.exit(1)
    except ConnectionRefusedError:
        print("ERROR: could not connect to Postgres. Is the server running?")
        sys.exit(1)
