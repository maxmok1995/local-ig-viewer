import re
import unittest
from pathlib import Path


class AutoFolderTemplateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_standard_second_level_folder_template_is_defined(self):
        required_patterns = [
            r'const\s+STANDARD_SECOND_LEVEL_FOLDERS\s*=\s*\[',
            r'["\']人-合照["\']',
            r'["\']工作-出差["\']',
            r'["\']未分类["\']',
            r'["\']行-自驾["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_opening_folder_auto_creates_missing_template_dirs(self):
        required_patterns = [
            r'async\s+function\s+ensureStandardSecondLevelFolders\s*\(root\)',
            r'for\s*\(const\s+name\s+of\s+STANDARD_SECOND_LEVEL_FOLDERS\)',
            r'await\s+root\.getDirectoryHandle\(name,\s*\{create:true\}\)',
            r'S\.rootName\s*=\s*h\.name;[\s\S]*?await\s+ensureStandardSecondLevelFolders\(h\);[\s\S]*?S\.albums\s*=\s*await\s+readFolder\(h\);',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
