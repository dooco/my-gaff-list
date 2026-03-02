"""Backward-compatible production settings module.

Prefer using the settings package with DJANGO_ENV=production and
DJANGO_SETTINGS_MODULE=my_gaff_list.settings.

This file remains as a thin shim for any legacy deploys that reference
`my_gaff_list.settings_production` directly.
"""

from .settings.production import *  # noqa
