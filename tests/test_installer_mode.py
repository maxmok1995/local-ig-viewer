import unittest
from pathlib import Path


class InstallerModeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.py = (Path(__file__).resolve().parents[1] / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_installer_mode_only_bootstraps(self):
        self.assertIn("'安装本地IG.exe'", self.py)
        self.assertIn('仅生成本地IG目录，不自动打开UI', self.py)


if __name__ == '__main__':
    unittest.main()
