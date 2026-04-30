import unittest
from pathlib import Path


class OpenFolderRuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_frontend_can_request_server_to_open_folder(self):
        self.assertIn('requestOpenFolderViaServer', self.html)
        self.assertIn('__open_folder__', self.html)
        self.assertIn('explorerOpenOk', self.html)
        self.assertIn('explorerOpenFail', self.html)


if __name__ == '__main__':
    unittest.main()
