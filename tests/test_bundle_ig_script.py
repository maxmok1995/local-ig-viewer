import unittest
from pathlib import Path


class BundleIgScriptTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        cls.spec = (root / '本地相册启动器_v3_修复.spec').read_text(encoding='utf-8')
        cls.py = (root / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_spec_includes_ig_download_script(self):
        self.assertIn("('ig_download.py', '.')", self.spec)

    def test_bootstrap_sync_includes_ig_download_script(self):
        self.assertIn("BOOTSTRAP_SYNC_FILES = ['ig_download.py'", self.py)


if __name__ == '__main__':
    unittest.main()
