import re
import unittest
from pathlib import Path


class RootIndexSnapshotPrewarmTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_snapshot_prewarm_helper_exists(self):
        required_patterns = [
            r'function\s+applyRootIndexSnapshotToState\s*\(',
            r'if\(!snapshot\)\s*return',
            r'Array\.isArray\(snapshot\.defaultFolderCategories\)',
            r'typeof\s+snapshot\.rootAbsPath===\s*["\']string["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_load_folder_applies_snapshot_to_state_before_full_scan(self):
        required_patterns = [
            r'S\.rootIndexSnapshot\s*=\s*await\s+readRootIndexSnapshot\(h\)',
            r'applyRootIndexSnapshotToState\(S\.rootIndexSnapshot\)',
            r'S\.rootName\s*=\s*h\.name;[\s\S]*?S\.rootIndexSnapshot\s*=\s*await\s+readRootIndexSnapshot\(h\);[\s\S]*?applyRootIndexSnapshotToState\(S\.rootIndexSnapshot\);[\s\S]*?await\s+ensureStandardSecondLevelFolders\(h\);[\s\S]*?S\.albums\s*=\s*await\s+readFolder\(h\);',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
