import os

# Default to development unless explicitly set
env = os.environ.get("DJANGO_ENV", "development").lower()

if env == "production":
    from .production import *  # noqa
elif env == "staging":
    from .staging import *  # noqa
else:
    from .development import *  # noqa
