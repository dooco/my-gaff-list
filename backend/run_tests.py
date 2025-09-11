#!/usr/bin/env python
"""Simple test runner script for the new test suites."""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

if __name__ == '__main__':
    os.environ['DJANGO_SETTINGS_MODULE'] = 'test_settings'
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=True, keepdb=True)
    
    # Run specific test modules
    test_modules = [
        'apps.landlords.tests.test_models',
        'apps.landlords.tests.test_serializers', 
        'apps.landlords.tests.test_views',
        'apps.messaging.tests.test_models',
        'apps.messaging.tests.test_serializers',
        'apps.messaging.tests.test_views',
    ]
    
    failures = test_runner.run_tests(test_modules)
    sys.exit(bool(failures))