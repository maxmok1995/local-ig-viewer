import re
import unittest
from pathlib import Path


class RootIndexSnapshotReadStateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_tracks_latest_root_index_snapshot(self):
        required_patterns = [
            r'rootIndexSnapshot\s*:\s*null',
            r'rootIndexSnapshotLoadedAt\s*:\s*0',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_load_folder_reads_snapshot_before_full_scan(self):
        required_patterns = [
            r'S\.rootIndexSnapshot\s*=\s*await\s+readRootIndexSnapshot\(h\)',
            r'S\.rootIndexSnapshotLoadedAt\s*=\s*Date\.now\(\)',
            r'S\.rootName\s*=\s*h\.name;[\s\S]*?S\.rootIndexSnapshot\s*=\s*await\s+readRootIndexSnapshot\(h\);[\s\S]*?await\s+ensureStandardSecondLevelFolders\(h\);[\s\S]*?S\.albums\s*=\s*await\s+readFolder\(h\);',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
