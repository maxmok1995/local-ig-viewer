import unittest
from pathlib import Path


class LauncherBatchTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = (Path(__file__).resolve().parents[1] / '启动本地相册_修复版.bat').read_text(encoding='utf-8', errors='replace')

    def test_readiness_check_does_not_depend_on_page_chinese_text_match(self):
        self.assertNotIn("-match '本地相册'", self.text)
        self.assertIn("-match 'btnWelcomeOpen'", self.text)

    def test_launcher_prefers_python_server_script_instead_of_raw_http_server(self):
        self.assertIn('scripts\\serve_local_album.py', self.text)
        self.assertNotIn('-m http.server', self.text)

    def test_launcher_uses_status_file_for_clearer_startup_result(self):
        self.assertIn('LOCAL_IG_STATUS_FILE', self.text)
        self.assertIn('status', self.text.lower())

    def test_launcher_can_reuse_existing_local_ig_server(self):
        self.assertIn(':probe_existing_server', self.text)
        self.assertIn('EXISTING_URL', self.text)


if __name__ == '__main__':
    unittest.main()
