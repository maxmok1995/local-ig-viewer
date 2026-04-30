import re
import unittest
from pathlib import Path


class FilterAutoLockTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_tracks_auto_collapse_lock(self):
        required_patterns = [
            r'filterAutoCollapseLocked\s*:\s*false',
            r'localStorage\.getItem\(["\']filter-auto-collapse-locked["\']\)',
            r'localStorage\.setItem\(["\']filter-auto-collapse-locked["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_search_bar_has_lock_button_next_to_expand_button(self):
        required_patterns = [
            r'id\s*=\s*["\']filterLockBtn["\']',
            r'wrap\.appendChild\(lockBtn\)',
            r'syncFilterLockBtn\(',
            r'lockBtn\.addEventListener\(["\']click["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_auto_collapse_only_runs_when_lock_enabled(self):
        required_patterns = [
            r'if\(!S\.filterAutoCollapseLocked\)\s*\{\s*S\.lastHomeScrollTop\s*=\s*scrollTop;\s*return;\s*\}',
            r'btn\.title\s*=\s*S\.filterAutoCollapseLocked\s*\?\s*["\']自動收起已鎖定["\']\s*:\s*["\']自動收起已關閉["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
