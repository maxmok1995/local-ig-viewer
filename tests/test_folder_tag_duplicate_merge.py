import re
import unittest
from pathlib import Path


class FolderTagDuplicateMergeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_move_to_folder_category_reuses_same_post_directory_instead_of_suffix_duplicate(self):
        required_patterns = [
            r'async\s+function\s+isSameAlbumDirectory\s*\(',
            r'const\s+existingDir\s*=\s*await\s+destDir\.getDirectoryHandle\(srcName\)',
            r'if\(await\s+isSameAlbumDirectory\(srcDir,\s*existingDir\)\)',
            r'destName\s*=\s*srcName',
            r'await\s+copyDirectoryRecursive\(srcDir,\s*newDir,\s*\{skipExisting:true\}\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
