import unittest
from pathlib import Path


class ServerOpenFolderEndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.py = (Path(__file__).resolve().parents[1] / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_server_exposes_open_folder_endpoint(self):
        self.assertIn('__open_folder__', self.py)
        self.assertIn('do_POST', self.py)
        self.assertIn('open_folder_in_explorer', self.py)
        self.assertIn('explorer.exe', self.py)


if __name__ == '__main__':
    unittest.main()
