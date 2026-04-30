import re
import unittest
from pathlib import Path


class VersioningConventionTest(unittest.TestCase):
    def test_version_file_contains_semver(self):
        root = Path(__file__).resolve().parents[1]
        version = (root / 'VERSION').read_text(encoding='utf-8').strip()
        self.assertRegex(version, r'^\d+\.\d+\.\d+$')

    def test_changelog_mentions_current_version(self):
        root = Path(__file__).resolve().parents[1]
        version = (root / 'VERSION').read_text(encoding='utf-8').strip()
        changelog = (root / 'CHANGELOG.md').read_text(encoding='utf-8')
        self.assertIn(f'## v{version}', changelog)


if __name__ == '__main__':
    unittest.main()
