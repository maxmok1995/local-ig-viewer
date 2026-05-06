import re
import unittest
from pathlib import Path


class RootIndexSnapshotTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_root_index_snapshot_helpers_exist(self):
        required_patterns = [
            r'const\s+ROOT_INDEX_FILE\s*=\s*["\']\.local-ig-index\.json["\']',
            r'function\s+buildRootIndexSnapshot\s*\(',
            r'async\s+function\s+readRootIndexSnapshot\s*\(',
            r'async\s+function\s+writeRootIndexSnapshot\s*\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_snapshot_contains_minimum_root_and_album_record_fields(self):
        required_patterns = [
            r'version:\s*1',
            r'rootName:\s*root\.name',
            r'rootAbsPath:\s*S\.rootAbsPath\s*\|\|\s*null',
            r'defaultFolderCategories:\s*\[\.\.\.\(S\.defaultFolderCategories\|\|\[\]\)\]',
            r'albumRecords:\s*albumRecords\.map\(rec=>\(',
            r'name:\s*rec\.name',
            r'folderRelPath:\s*rec\._folderRelPath\s*\|\|\s*null',
            r'inheritTags:\s*\[\.\.\.\(rec\._inheritTags\|\|\[\]\)\]',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_read_folder_writes_snapshot_after_collecting_album_records(self):
        required_patterns = [
            r'const\s+snapshot\s*=\s*buildRootIndexSnapshot\(root,\s*albumRecords\)',
            r'await\s+writeRootIndexSnapshot\(root,\s*snapshot\)',
            r'const\s+albums\s*=\s*await\s+materializeAlbumsFromIndexRecords\(albumRecords,\s*root\.name\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
