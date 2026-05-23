import re
import unittest
from pathlib import Path


class InstanceLockPortTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.py = (Path(__file__).resolve().parents[1] / 'scripts' / 'serve_local_album.py').read_text(encoding='utf-8')

    def test_lock_port_is_derived_from_launch_dir(self):
        self.assertRegex(self.py, r'def\s+default_instance_lock_port\(')
        self.assertIn('zlib.crc32', self.py)
        self.assertIn("resolve_launch_dir()", self.py)
        self.assertIn("LOCAL_IG_INSTANCE_LOCK_PORT", self.py)


if __name__ == '__main__':
    unittest.main()
