import re
import unittest
from pathlib import Path


class FolderTagEditorMoveBugTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_tag_editor_l1_l2_selection_uses_primary_folder_move_flow(self):
        required_patterns = [
            r'const\s+folderCandidate\s*=\s*l2v\s*\|\|\s*l1v',
            r'if\(isStandardSecondLevelFolderTag\(folderCandidate\)\)',
            r'await\s+setPrimaryFolderCategoryTag\(alb,\s*folderCandidate\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
