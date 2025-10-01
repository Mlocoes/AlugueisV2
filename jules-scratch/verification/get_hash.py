import sys
from backend.routers.auth import get_password_hash

if __name__ == "__main__":
    password = sys.argv[1]
    hashed_password = get_password_hash(password)
    print(hashed_password)