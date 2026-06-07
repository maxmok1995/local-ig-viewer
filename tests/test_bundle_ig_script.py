import unittest
from pathlib import Path


class BundleIgScriptTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        cls.spec = (root / 'LocalAlbum.spec').read_text(encoding='utf-8')
        cls.py = (root / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_spec_includes_ig_download_script(self):
        self.assertIn("('ig_download.py', '.')", self.spec)

    def test_bootstrap_sync_includes_ig_download_script(self):
        self.assertIn("BOOTSTRAP_SYNC_FILES = ['ig_download.py'", self.py)

    def test_spec_includes_translator_script(self):
        self.assertIn("('APP - deep-translator.py', '.')", self.spec)

    def test_bootstrap_sync_includes_translator_script(self):
        self.assertIn("'APP - deep-translator.py'", self.py)


if __name__ == '__main__':
    unittest.main()
