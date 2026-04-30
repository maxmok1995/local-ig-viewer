import re
import unittest
from pathlib import Path


class MixedSecondLevelTagInheritanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_category_folder_direct_loose_media_inherits_second_level_folder_name(self):
        required_patterns = [
            r"const\s+catAlbums=await\s+readLooseDirAsAlbums\(h,name,\[name\],'auto'\)",
            r"catAlbums\.forEach\(a=>a\._folderRelPath=name\)",
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
