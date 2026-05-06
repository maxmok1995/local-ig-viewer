import re
import unittest
from pathlib import Path


class AlbumIndexLayerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_index_record_and_materializer_helpers_exist(self):
        required_patterns = [
            r'function\s+createAlbumIndexRecord\s*\(',
            r'async\s+function\s+materializeAlbumsFromIndexRecords\s*\(',
            r'async\s+function\s+readLooseDirAsAlbumIndexRecords\s*\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_read_loose_dir_builds_index_records_before_materialization(self):
        required_patterns = [
            r'const\s+albumRecords\s*=\s*\[\]',
            r'albumRecords\.push\(createAlbumIndexRecord\(',
            r'return\s+albumRecords;',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_read_folder_materializes_from_unified_index_records(self):
        required_patterns = [
            r'const\s+albumRecords\s*=\s*\[\]',
            r'albumRecords\.push\(createAlbumIndexRecord\(',
            r'const\s+albums\s*=\s*await\s+materializeAlbumsFromIndexRecords\(albumRecords,\s*root\.name\)',
            r'return\s+albums;',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
