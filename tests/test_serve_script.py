import unittest
from pathlib import Path


class ServeScriptTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = (Path(__file__).resolve().parents[1] / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_server_script_can_choose_next_free_port(self):
        self.assertIn('find_available_port', self.text)
        self.assertIn('socket', self.text)

    def test_server_script_supports_status_file_output(self):
        self.assertIn('LOCAL_IG_STATUS_FILE', self.text)
        self.assertIn('json', self.text)

    def test_server_script_can_disable_auto_browser_open(self):
        self.assertIn('LOCAL_IG_NO_BROWSER', self.text)


if __name__ == '__main__':
    unittest.main()
