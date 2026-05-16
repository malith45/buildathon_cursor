import bcrypt

# OWASP recommends >=10 rounds for bcrypt (2023+). Each +1 round doubles cost.
# 12 ≈ 250-400 ms per op, 10 ≈ 60-100 ms — still strong (2^10 iterations) and
# fast enough that sign-in/sign-up feels snappy. Existing hashes already in
# storage at higher costs continue to verify correctly because bcrypt encodes
# the cost factor inside the hash itself.
BCRYPT_ROUNDS = 10


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=BCRYPT_ROUNDS),
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False
