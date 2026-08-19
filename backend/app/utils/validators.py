"""
Input Validation Utilities
--------------------------
Centralised validators used by all blueprints.
Each validator returns (is_valid: bool, error_message: str | None).
"""
import re


def validate_required(data: dict, fields: list) -> tuple[bool, str | None]:
    """Check that all required fields are present and non-empty."""
    missing = [f for f in fields if not data.get(f) and data.get(f) != 0]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    return True, None


def validate_email(email: str) -> tuple[bool, str | None]:
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(pattern, email):
        return False, f"Invalid email: {email}"
    return True, None


def validate_phone(phone: str) -> tuple[bool, str | None]:
    if not re.match(r"^\+?[\d\s\-]{7,15}$", str(phone)):
        return False, f"Invalid phone number: {phone}"
    return True, None


def validate_capacity(capacity) -> tuple[bool, str | None]:
    try:
        val = float(capacity)
        if val <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return False, f"Capacity must be a positive number, got: {capacity}"
    return True, None


def validate_waste_kg(waste_kg) -> tuple[bool, str | None]:
    try:
        val = float(waste_kg)
        if val < 0:
            raise ValueError
    except (TypeError, ValueError):
        return False, f"Waste collected must be a non-negative number, got: {waste_kg}"
    return True, None


def validate_role(role: str) -> tuple[bool, str | None]:
    valid = {"system_admin", "district_admin", "mandal_officer", "supervisor", "collector"}
    if role not in valid:
        return False, f"Invalid role '{role}'. Must be one of: {', '.join(sorted(valid))}"
    return True, None


def validate_bin_id_format(bin_id: str) -> tuple[bool, str | None]:
    """Bin IDs must be non-empty strings, e.g. BIN-001."""
    if not bin_id or not isinstance(bin_id, str) or len(bin_id.strip()) == 0:
        return False, f"Invalid bin ID: {bin_id}"
    return True, None


def sanitise_string(value: str, max_len: int = 200) -> str:
    """Strip whitespace and truncate to max_len."""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()[:max_len]
