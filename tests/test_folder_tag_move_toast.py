import re
import unittest
from pathlib import Path


class FolderTagMoveToastTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_folder_category_move_toast_mentions_source_and_destination(self):
        required_patterns = [
            r"const\s+fromLabel\s*=\s*currentCategory\s*\|\|\s*['\"]未分类['\"]",
            r"const\s+moveMsg\s*=\s*`📁\s*已從\s*\$\{fromLabel\}\s*移動到\s*\$\{folderTag\}`",
            r"toast\(moveMsg,\s*2200\)",
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
