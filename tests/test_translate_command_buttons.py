import re
import unittest
from pathlib import Path


class TranslateCommandButtonsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_translate_modal_has_cmd_and_powershell_copy_buttons(self):
        required_patterns = [
            r'transCopyCmdBtn',
            r'transCopyPsBtn',
            r'buildPowerShellCmd',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
