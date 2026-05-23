import unittest
from pathlib import Path


class LauncherExeSyncTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.py = (Path(__file__).resolve().parents[1] / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_nested_launcher_is_always_overwritten(self):
        self.assertIn('dst_exe.write_bytes(src_exe.read_bytes())', self.py)
        self.assertNotIn('if not dst_exe.exists():', self.py)


if __name__ == '__main__':
    unittest.main()
