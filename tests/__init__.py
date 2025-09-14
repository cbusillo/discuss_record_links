# Expose JS unit tests in subpackage so Odoo test loader finds them
import sys

try:
    from .js import js_unit_tests as _js_unit_tests
except ImportError:
    _js_unit_tests = None  # pragma: no cover - best-effort import

if _js_unit_tests is not None:
    # Re-expose under a test_* name for Odoo discovery
    sys.modules[__name__].test_js_units = _js_unit_tests
