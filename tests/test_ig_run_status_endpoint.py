import unittest
from pathlib import Path


class IgRunStatusEndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        cls.py = (root / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')
        cls.html = (root / 'local-ig.html').read_text(encoding='utf-8')

    def test_server_has_status_endpoint(self):
        self.assertIn('/__ig_download_status__', self.py)
        self.assertIn('def get_ig_download_status', self.py)

    def test_frontend_polls_status_endpoint(self):
        self.assertIn('/__ig_download_status__', self.html)
        self.assertIn('下载进行中', self.html)


if __name__ == '__main__':
    unittest.main()
